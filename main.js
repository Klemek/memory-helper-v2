/* exported app, utils */

const utils = {
    cloneObject: function (obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    serialize: function (list) {
        return LZString.compressToEncodedURIComponent(list.map(v => v.join('|')).join('|'));
    },
    deserialize: function (rawData) {
        const data = LZString.decompressFromBase64(rawData) ?? LZString.decompressFromEncodedURIComponent(rawData);
        try {
            return JSON.parse(data);
        } catch {
            let output = [];
            data.split('|').forEach((v, i) => {
                if (i % 2 === 0) {
                    output.push([ v, '' ]);
                } else {
                    output[output.length - 1][1] = v;
                }
            });
            return output;
        }
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
            current: {},
            failed: {},
            done: {},
            newRow: [ '', '' ],
            showConfig: true,
            modes: [ 0 ],
            size: 0,
            mode: 0,
        };
    },
    computed: {
        currentYear() {
            return new Date().getFullYear();
        },
        doneDisplay() {
            return this.modes
                .map(m => this.done[m].length)
                .reduce((a, b) => a + b, 0);
        },
        availableDisplay() {
            return this.modes.length * this.available.length;
        },
        allDone() {
            return this.modes.filter(m => this.current[m].length > 0).length === 0;
        },
        q2a: {
            get() {
                return this.modes.indexOf(0) >= 0;
            },
            set(newValue) {
                if (!newValue && this.modes.length > 1) {
                    this.modes.splice(this.modes.indexOf(0), 1);
                } else if (!this.q2a) {
                    this.modes.push(0);
                }
                this.reset();
            },
        },
        a2q: {
            get() {
                return this.modes.indexOf(1) >= 0;
            },
            set(newValue) {
                if (!newValue && this.modes.length > 1) {
                    this.modes.splice(this.modes.indexOf(1), 1);
                } else if (!this.a2q) {
                    this.modes.push(1);
                }
                this.reset();
            },
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
            this.done[this.mode].push(this.current[this.mode].shift());
            this.nextQuestion();
        },
        wrong() {
            this.failed[this.mode].push(this.current[this.mode].shift());
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
            this.current = Object.fromEntries(this.modes.map(m => [ m, utils.shuffle(utils.cloneObject(this.available)) ]));
            this.done = Object.fromEntries(this.modes.map(m => [ m, [] ]));
            this.failed = Object.fromEntries(this.modes.map(m => [ m, [] ]));
            this.nextQuestion();
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

            if (this.current[this.mode].length > 0) {
                this.question = this.current[this.mode][0][this.mode];
                this.answer = this.current[this.mode][0][1 - this.mode];
            }
        },
        getLetter() {
            if (this.modes.length === 1 && this.modes[0] === 0) {
                return 'd';
            }
            if (this.modes.length === 1 && this.modes[0] === 1) {
                return 'e';
            }
            return 'f';
        },
    },
    beforeMount() {
        const url = new URL(window.location);
        if (url.searchParams.get('d') || url.searchParams.get('e') || url.searchParams.get('f')) {
            if (url.searchParams.get('d')) {
                this.modes = [ 0 ];
            } else if (url.searchParams.get('e')) {
                this.modes = [ 1 ];
            } else {
                this.modes = [ 0, 1 ];
            }
            this.available = utils.deserialize(url.searchParams.get(this.getLetter()));
            this.showConfig = false;
            this.reset();
        }
        this.size = url.href.length;
    },
    updated() {
        const data = utils.serialize(this.available);
        const url = new URL(window.location);
        if (url.searchParams.get(this.getLetter()) !== data) {
            url.searchParams.delete('d');
            url.searchParams.delete('e');
            url.searchParams.delete('f');
            url.searchParams.set(this.getLetter(), data);
            window.history.pushState({}, '', url);
        }
        this.size = url.href.length;
    },
    mounted: function () {
        setTimeout(this.showApp);
    },
};

window.onload = () => {
    app = Vue.createApp(app);
    app.mount('#app');
};
