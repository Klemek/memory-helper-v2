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
        const output = [ ...array ];
        if (output.length < 2) {
            return output;
        }
        for (let i = 0; i < array.length; i++) {
            const i1 = this.randindex(array);
            const i2 = this.randindex(array, i1);
            [ output[i1], output[i2] ] = [ output[i2], output[i1] ];
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
            modes: [ ],
            size: 0,
            mode: 0,
            title: '',
            url: '',
            error: '',
            columns: [],
        };
    },
    computed: {
        currentYear() {
            return new Date().getFullYear();
        },
        doneDisplay() {
            return this.modes
                .map(m => this.done[m]?.length ?? 0)
                .reduce((a, b) => a + b, 0);
        },
        availableDisplay() {
            return this.modes.length * this.available.length;
        },
        allDone() {
            return this.modes.filter(m => (this.current[m]?.length ?? 0) > 0).length === 0;
        },
        currentItem() {
            if (! this.current[this.mode]?.length) {
                return null;
            }

            return this.current[this.mode][0];
        },
    },
    methods: {
        getFormatedData(i) {
            if (this.currentItem[i].startsWith('data:')) {
                return this.columns[i] + ' :<br><img src="' + this.currentItem[i] + '" />';
            }
            return this.columns[i] + ' : ' + this.currentItem[i];
        },
        showApp() {
            document.getElementById('app').setAttribute('style', '');
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
            this.current = Object.fromEntries(this.modes.map(m => [ m, utils.shuffle(utils.cloneObject(this.available)) ]));
            this.done = Object.fromEntries(this.modes.map(m => [ m, [] ]));
            this.failed = Object.fromEntries(this.modes.map(m => [ m, [] ]));
            if (this.modes.length) {
                this.nextQuestion();
            }
        },
        nextQuestion() {
            this.showAnswer = false;

            this.modes.forEach(m => {
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
                this.error = 'CSV file contains errors';
            } else {
                const url = new URL(window.location);
                this.columns = results.data.shift();
                this.modes = this.columns.map((_, i) => i);
                if (url.searchParams.get('modes')) {
                    try {
                        this.modes = JSON.parse(url.searchParams.get('modes')).filter(m => m < this.columns.length);
                    } catch {}
                }
                this.available = results.data;
                this.reset();
            }
        },
        dataError() {
            this.error = 'Could not read file';
        },
    },
    watch: {
        async url(newValue) {
            this.available = [];
            this.error = '';
            if (newValue) {
                Papa.parse(newValue, {
                    download: true,
                    complete: this.dataComplete,
                    error: this.dataError,
                });
            }
        },
    },
    beforeMount() {
        const url = new URL(window.location);
        this.url = url.searchParams.get('url') ?? '';
        this.title = url.searchParams.get('title') ?? '';
        this.showConfig = !this.url;
    },
    updated() {
        const url = new URL(window.location);
        if (
            url.searchParams.get('url') !== this.url ||
            url.searchParams.get('title') !== this.title ||
            url.searchParams.get('modes') !== JSON.stringify(this.modes)
        ) {
            url.searchParams.set('url', this.url);
            url.searchParams.set('title', this.title);
            url.searchParams.set('modes', JSON.stringify(this.modes));
            window.history.pushState({}, '', url);
        }
    },
    mounted: function () {
        setTimeout(this.showApp);
    },
};

window.onload = () => {
    app = Vue.createApp(app);
    app.mount('#app');
};
