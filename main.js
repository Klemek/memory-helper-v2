/* exported app, utils */

const utils = {
    cloneObject: function (obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    serialize: function (list) {
        return LZString.compressToBase64(JSON.stringify(list));
    },
    deserialize: function (rawData) {
        return JSON.parse(LZString.decompressFromBase64(rawData));
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
            question: '',
            answer: '',
            showAnswer: false,
            available: [],
            current: [],
            failed: [],
            done: [],
            newRow: [ '', '' ],
            showConfig: true,
            q2a: true,
            a2q: false,
        };
    },
    computed: {
        currentYear() {
            return new Date().getFullYear();
        },
        urlLength() {
            return window.location.toString().length;
        },
    },
    methods: {
        showApp() {
            document.getElementById('app').setAttribute('style', '');
        },
        show() {
            this.showAnswer = true;
        },
        right() {
            this.done.push(this.current.shift());
            this.nextQuestion();
        },
        wrong() {
            this.failed.push(this.current.shift());
            this.nextQuestion();
        },
        deleteRow(i) {
            this.available.splice(i, 1);
            this.reset();
        },
        addRow() {
            if (this.newRow[0] && this.newRow[1]) {
                this.available.push(utils.cloneObject(this.newRow));
                this.newRow = [ '', '' ];
            }
            this.reset();
        },
        reset() {
            this.current = utils.shuffle(utils.cloneObject(this.available));
            this.done = [];
            this.failed = [];
            this.nextQuestion();
        },
        nextQuestion() {
            this.showAnswer = false;

            if (this.current.length === 0 && this.failed.length > 0) {
                this.current = utils.shuffle(utils.cloneObject(this.failed));
                this.failed = [];
            }

            if (this.current.length > 0) {
                if ((this.a2q && !this.q2a) || (this.a2q === this.q2a && utils.randint(0, 2) === 1)) {
                    this.answer = this.current[0][0];
                    this.question = this.current[0][1];
                } else {
                    this.question = this.current[0][0];
                    this.answer = this.current[0][1];
                }
            }
        },
    },
    beforeMount() {
        const url = new URL(window.location);
        if (url.searchParams.get('d')) {
            this.available = utils.deserialize(url.searchParams.get('d'));
            this.showConfig = false;
            this.reset();
        }
    },
    updated() {
        const data = utils.serialize(this.available);
        const url = new URL(window.location);
        if (url.searchParams.get('d') !== data) {
            url.searchParams.set('d', data);
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
