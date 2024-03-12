/* exported app, utils */

const utils = {
  cloneObject: function (obj) {
    return JSON.parse(JSON.stringify(obj));
  },
  randint: function (min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  },
  randindex: function (array, ...toIgnore) {
    let index;
    do {
      index = this.randint(0, array.length);
    } while (this.contains(toIgnore, index));
    return index;
  },
  randitem: function (array) {
    return array[this.randindex(array)];
  },
  randindexes: function (array, number, ...toIgnore) {
    const output = [];
    for (let i = 0; i < number; i++) {
      output.push(this.randindex(array, ...output, ...toIgnore));
    }
    return output;
  },
  shuffle: function (array) {
    const output = [...array];
    if (output.length < 2) {
      return output;
    }
    for (let i = 0; i < array.length; i++) {
      const i1 = this.randindex(array);
      const i2 = this.randindex(array, i1);
      [output[i1], output[i2]] = [output[i2], output[i1]];
    }
    return output;
  },
  contains: function (array, item) {
    return array.indexOf(item) >= 0;
  },
};

let app = {
  data() {
    return {
      showAnswer: false,
      available: [],
      current: {},
      failed: {},
      done: {},
      showConfig: true,
      modes: [],
      size: 0,
      mode: 0,
      title: "",
      url: "",
      error: "",
      multiple: 0,
      columns: [],
      answers: [],
      answered: 0,
    };
  },
  computed: {
    currentYear() {
      return new Date().getFullYear();
    },
    doneDisplay() {
      return this.modes
        .map((m) => this.done[m]?.length ?? 0)
        .reduce((a, b) => a + b, 0);
    },
    availableDisplay() {
      return this.modes.length * this.available.length;
    },
    allDone() {
      return (
        this.modes.filter((m) => (this.current[m]?.length ?? 0) > 0).length ===
        0
      );
    },
    currentItem() {
      if (!this.current[this.mode]?.length) {
        return null;
      }

      return this.current[this.mode][0];
    },
  },
  methods: {
    getFormatedData(i) {
      if (this.currentItem[i].startsWith("data:")) {
        return (
          this.columns[i] + ' :<br><img src="' + this.currentItem[i] + '" />'
        );
      }
      return this.columns[i] + " : " + this.currentItem[i];
    },
    getFormatedDataAnswer(i, j) {
      if (this.answers[j][i].startsWith("data:")) {
        return (
          this.columns[i] + ' :<br><img src="' + this.answers[j][i] + '" />'
        );
      }
      return this.columns[i] + " : " + this.answers[j][i];
    },
    showApp() {
      document.getElementById("app").setAttribute("style", "");
    },
    clickAnswer(i) {
      if (this.showAnswer) {
        if (this.answers[this.answered][-1] === this.currentItem[-1]) {
          this.right();
        } else {
          this.wrong();
        }
      } else {
        this.showAnswer = true;
        this.answered = i;
      }
    },
    show() {
      this.showAnswer = true;
    },
    right() {
      this.done[this.mode].push(this.current[this.mode].shift());
      this.nextQuestion();
    },
    wrong() {
      this.failed[this.mode].push(this.current[this.mode].shift());
      this.nextQuestion();
    },
    reset() {
      this.current = Object.fromEntries(
        this.modes.map((m) => [
          m,
          utils.shuffle(utils.cloneObject(this.available)),
        ])
      );
      this.done = Object.fromEntries(this.modes.map((m) => [m, []]));
      this.failed = Object.fromEntries(this.modes.map((m) => [m, []]));
      if (this.modes.length) {
        this.nextQuestion();
      }
    },
    nextQuestion() {
      this.showAnswer = false;

      this.modes.forEach((m) => {
        if (this.current[m].length === 0 && this.failed[m].length > 0) {
          this.current[m] = utils.shuffle(utils.cloneObject(this.failed[m]));
          this.failed[m] = [];
        }
      });

      let tries = 0;
      let newMode;
      do {
        tries++;
        newMode = utils.randitem(this.modes);
      } while (this.current[newMode].length === 0 && tries < 100);

      this.mode = newMode;

      if (this.multiple > 0) {
        this.generateAnswers();
      }
    },
    generateAnswers() {
      this.answers = [this.currentItem];

      const total = Math.min(this.multiple, this.available.length);

      let tries = 0;
      let id;
      const ids = [this.currentItem[-1]];
      while (this.answers.length < total && tries < 100) {
        tries++;
        id = utils.randindex(this.available, ...ids);
        if (this.available[id][this.mode] !== this.currentItem[this.mode]) {
          this.answers.push(this.available[id]);
          ids.push(id);
        }
      }

      this.answers = utils.shuffle(this.answers);
    },
    change(n, value) {
      if (!value && this.modes.length > 1) {
        this.modes.splice(this.modes.indexOf(n), 1);
      } else if (value && !utils.contains(this.modes, n)) {
        this.modes.push(n);
      }
      this.reset();
    },
    dataComplete(results) {
      if (results.errors.length) {
        this.error = "CSV file contains errors";
      } else {
        const url = new URL(window.location);
        this.columns = results.data.shift();
        this.modes = this.columns.map((_, i) => i);
        if (url.searchParams.get("modes")) {
          try {
            this.modes = JSON.parse(url.searchParams.get("modes")).filter(
              (m) => m < this.columns.length
            );
          } catch {}
        }
        this.available = results.data;
        this.available.forEach((data, i) => {
          data.push(i);
        });
        this.reset();
      }
    },
    dataError() {
      this.error = "Could not read file";
    },
  },
  watch: {
    async url(newValue) {
      this.available = [];
      this.error = "";
      if (newValue) {
        fetch(newValue, {
          headers: {
            Origin: window.location.host,
          },
        })
          .then((response) => {
            response
              .text()
              .then((content) => {
                Papa.parse(content, {
                  complete: this.dataComplete,
                  error: this.dataError,
                });
              })
              .catch(this.dataError);
          })
          .catch(this.dataError);
      }
    },
    multiple() {
      this.reset();
    },
  },
  beforeMount() {
    const url = new URL(window.location);
    this.url = url.searchParams.get("url") ?? "";
    this.title = url.searchParams.get("title") ?? "";
    this.multiple = parseInt(url.searchParams.get("multiple") ?? 0) ?? 0;
    if (this.multiple === NaN) {
      this.multiple = 0;
    }
    this.showConfig = !this.url;
  },
  updated() {
    const url = new URL(window.location);
    if (
      url.searchParams.get("url") !== this.url ||
      url.searchParams.get("title") !== this.title ||
      url.searchParams.get("modes") !== JSON.stringify(this.modes) ||
      url.searchParams.get("multiple") !== this.multiple
    ) {
      url.searchParams.set("url", this.url);
      url.searchParams.set("title", this.title);
      url.searchParams.set("modes", JSON.stringify(this.modes));
      url.searchParams.set("multiple", this.multiple);
      window.history.pushState({}, "", url);
    }
  },
  mounted: function () {
    setTimeout(this.showApp);
  },
};

window.onload = () => {
  app = Vue.createApp(app);
  app.mount("#app");
};
