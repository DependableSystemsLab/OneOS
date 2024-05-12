const randstr = (len = 8) => Array.from({ length: len }).map(_ => 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]).join('');
const joinPath = (base, path) => ((base[base.length - 1] === '/' ? base.slice(0,-1) : base) + '/' + (path[0] === '/' ? path.slice(1) : path));

const ajax = {
    get: (url, raw) => fetch(url, {
        method: 'GET'
    }).then(resp => {
        if (resp.status === 200) {
            if (resp.redirected) window.location.assign(resp.url);
            else return raw ? resp.blob() : resp.json();
        }
        else {
            return resp.text().then(body => {
                throw new Error(body);
            })
        }
    }),
    post: (url, body) => fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    }).then(resp => {
        if (resp.status === 200) {
            if (resp.redirected) window.location.assign(resp.url);
            else return resp.json();
        }
        else {
            return resp.text().then(body => {
                throw new Error(body);
            })
        }
    })
}

/* reusable UI components */
Vue.component('app-window', {
    props: [ 'appInstance' ],
    data: () => ({
        width: Math.round(window.innerWidth * 0.6),
        height: Math.round(window.innerHeight * 0.75),
        posX: window.innerWidth / 2 - Math.round(window.innerWidth * 0.3),
        posY: window.innerHeight / 2 - Math.round(window.innerHeight * 0.375),
        dialogState: {
            text: '',
            mode: 'alert',
            isActive: false
        }
    }),
    computed: {
        isMaximized: function () {
            return this.width === window.innerWidth && this.height === window.innerHeight - this.$el.parentElement.offsetTop;
        }
    },
    methods: {
        dragStart: function (evt) {
            const _referencePos = { x: evt.clientX, y: evt.clientY };
            const _onMouseMove = (evt) => {
                this.posX += evt.clientX - _referencePos.x;
                this.posY += evt.clientY - _referencePos.y;
                _referencePos.x = evt.clientX;
                _referencePos.y = evt.clientY;
            }
            const _onMouseUp = (evt) => {
                document.removeEventListener('mousemove', _onMouseMove);
                document.removeEventListener('mouseup', _onMouseUp);
            }

            document.addEventListener('mousemove', _onMouseMove);
            document.addEventListener('mouseup', _onMouseUp);
        },
        resizeLeft: function (evt) {
            let _referenceX = evt.clientX;
            const _onMouseMove = (evt) => {
                this.width -= evt.clientX - _referenceX;
                this.posX += evt.clientX - _referenceX;
                _referenceX = evt.clientX;
            }
            const _onMouseUp = (evt) => {
                document.removeEventListener('mousemove', _onMouseMove);
                document.removeEventListener('mouseup', _onMouseUp);
            }

            document.addEventListener('mousemove', _onMouseMove);
            document.addEventListener('mouseup', _onMouseUp);
        },
        resizeRight: function (evt) {
            let _referenceX = evt.clientX;
            const _onMouseMove = (evt) => {
                this.width += evt.clientX - _referenceX;
                _referenceX = evt.clientX;
            }
            const _onMouseUp = (evt) => {
                document.removeEventListener('mousemove', _onMouseMove);
                document.removeEventListener('mouseup', _onMouseUp);
            }

            document.addEventListener('mousemove', _onMouseMove);
            document.addEventListener('mouseup', _onMouseUp);
        },
        resizeBottom: function (evt) {
            let _referenceY = evt.clientY;
            const _onMouseMove = (evt) => {
                this.height += evt.clientY - _referenceY;
                _referenceY = evt.clientY;
            }
            const _onMouseUp = (evt) => {
                document.removeEventListener('mousemove', _onMouseMove);
                document.removeEventListener('mouseup', _onMouseUp);
            }

            document.addEventListener('mousemove', _onMouseMove);
            document.addEventListener('mouseup', _onMouseUp);
        },
        maximize: function (evt) {
            this.prevDimensions = {
                posX: this.posX,
                posY: this.posY,
                width: this.width,
                height: this.height
            }

            const offsetTop = this.$el.parentElement.offsetTop;
            this.posX = 0;
            this.posY = offsetTop;
            this.width = window.innerWidth;
            this.height = window.innerHeight - offsetTop;
        },
        shrink: function (evt) {
            this.posX = this.prevDimensions.posX;
            this.posY = this.prevDimensions.posY;
            this.width = this.prevDimensions.width;
            this.height = this.prevDimensions.height;
        },
        alertDialog: function (text) {
            this.dialogState.mode = 'alert';
            this.dialogState.text = text;
            this.dialogState.isActive = true;
        },
        confirmDialog: function (text) {
            return new Promise((resolve, reject) => {
                this.dialogState._resolve = resolve;
                this.dialogState._reject = reject;

                this.dialogState.mode = 'confirm';
                this.dialogState.text = text;
                this.dialogState.isActive = true;
            });
        },
        handleDialogConfirm: function () {
            if (this.dialogState.mode === 'confirm') {
                this.dialogState._resolve();
                delete this.dialogState._resolve;
                delete this.dialogState._reject;
            }
            this.dialogState.isActive = false;
        },
        handleDialogCancel: function () {
            if (this.dialogState.mode === 'confirm') {
                this.dialogState._reject();
                delete this.dialogState._resolve;
                delete this.dialogState._reject;
            }
            this.dialogState.isActive = false;
        }
    },
    provide: function () {
        return {
            $alert: this.alertDialog,
            $confirm: this.confirmDialog
        };
    },
    mounted: function () {
        // need to inject $alert and $confirm manually into appInstance
        // in case the appInstance needs to get confirmation from user
        this.appInstance.$alert = text => this.alertDialog(text);
        this.appInstance.$confirm = text => this.confirmDialog(text);
    },
    template: `<div class="app-window" :style="{ width: width + 'px', height: height + 'px', left: posX + 'px', top: posY + 'px' }" @click="$emit('focus')">
        <div class="title-bar" @mousedown="dragStart">
            <span>{{ appInstance.title }}</span>
            <div class="grow-1"></div>
            <div class="flex row">
                <div class="button">
                    <span @click="$emit('minimize')" class="icon-1 icon-minimize"></span>
                </div>
                <div class="button">
                    <span v-if="isMaximized" @click="shrink" class="icon-1 icon-shrink"></span>
                    <span v-else @click="maximize" class="icon-1 icon-maximize"></span>
                </div>
                <div class="button">
                    <span @click="$emit('exit')" class="icon-1 icon-close"></span>
                </div>
            </div>
        </div>
        <div class="menu-bar" v-if="appInstance.menu.length > 0">
            <dropdown v-for="(item, index) in appInstance.menu" :key="index" :group="appInstance.id" :menu-item="item"></dropdown>
        </div>
        <div class="content">
            <component :is="appInstance.componentTagName" :app-instance="appInstance" @exit="$emit('exit')"></component>
        </div>
        <div class="overlay" :class="{ active: dialogState.isActive || appInstance.isBusy }">
            <span v-show="appInstance.isBusy" class="loader"></span>
            <dialog-window :mode="dialogState.mode" :is-active="dialogState.isActive" @confirm="handleDialogConfirm" @cancel="handleDialogCancel">{{ dialogState.text }}</dialog-window>
        </div>
        <div class="resizer-l" @mousedown="resizeLeft"></div>
        <div class="resizer-r" @mousedown="resizeRight"></div>
        <div class="resizer-b" @mousedown="resizeBottom"></div>
    </div>`
});

Vue.component('dialog-window', {
    props: [ "mode", "okLabel", "cancelLabel", "isActive" ],
    template: `<div class="dialog" :class="{ active: isActive }">
        <div class="message"><slot></slot></div>
        <div class="control">
            <button class="button positive" @click="$emit('confirm')">{{ okLabel || "OK" }}</button>
            <button class="button negative" v-if="mode === 'confirm'" @click="$emit('cancel')">{{ cancelLabel || "Cancel" }}</button>
        </div>
    </div>`
});

Vue.component('tabs', {
    data: () => ({
        activeTab: null,
        tabs: []
    }),
    template: `<div class="tabs">
        <ul>
            <li v-for="label in tabs" :key="label" :class="{ 'active': label === activeTab }">
	    	    <a v-on:click="activeTab = label">{{ label }}</a>
	        </li>
        </ul>
	    <slot></slot>
    </div>`,
    created: function () {
        let tabs = this.$slots.default.filter(elem => (elem.componentOptions && elem.componentOptions.tag === 'tab')).forEach(elem => {
            this.$data.tabs.push(elem.componentOptions.propsData.label);
        });

        this.$data.activeTab = this.$data.tabs[0];
    }
});

Vue.component('tab', {
    props: ['label'],
    template: `<div v-show="$parent.activeTab === label" class="tab"><slot></slot></div>`
});

const dropdownManager = (() => {
    const groups = {};
    return {
        getGroup: id => {
            if (!groups[id]) groups[id] = { openItem: null };
            return groups[id];
        }
    }
})();
Vue.component('dropdown', {
    props: ["menuItem", "group"],
    data: () => ({
        groupState: dropdownManager.getGroup(this.group)
    }),
    methods: {
        isOpen: function () {
            return this.groupState.openItem === this._dropdownId;
        },
        toggle: function (evt) {
            this.groupState.openItem = this.isOpen() ? null : this._dropdownId;
            evt.stopPropagation();
        }
    },
    created: function () {
        this._dropdownId = randstr();
        this._clickOutsideListener = evt => {
            this.groupState.openItem = null;
        };
        this.$eventBus.$on('clickOutside', this._clickOutsideListener);
    },
    beforeDestroy: function () {
        this.$eventBus.$off('clickOutside', this._clickOutsideListener);
    },
    template: `<div class="dropdown" :class="{ 'active': isOpen() }">
        <div class="dropdown-button">
            <span @click="toggle">{{ menuItem.label }}</span>
        </div>
        <div class="dropdown-menu">
            <div v-for="item in menuItem.submenu" class="menu-item">
                <a v-if="item.submenu.length < 1" @click="item.onClick">{{ item.label }}</a>
                <dropdown v-else :menu-item="item"></dropdown>
            </div>
        </div>
    </div>`
});

Vue.component('sortable-table', {
    props: ['items', 'keyfield', 'clickable'],
    data: () => ({
        sorted: [],
        itemsPerPage: 25,
        fields: [],
        sortBy: null,
        selectedItem: null
    }),
    created: function () {
        this.$slots.default.filter(elem => (elem.componentOptions && elem.componentOptions.tag === 'sortable-table-column')).forEach(elem => {
            this.$data.fields.push({
                name: elem.componentOptions.propsData.field,
                sort: elem.componentOptions.propsData.sort
            });
        });

        this.sort(this.$props.keyfield);
    },
    methods: {
        sort: function (field) {
            if (this.sortBy === field) {
                this.sorted.reverse();
            }
            else {
                let sortByField = this.fields.find(item => item.name === field);
                this.sorted = this.$props.items.slice().sort(sortByField.sort);
                this.sortBy = field;
            }
        }
    },
    watch: {
        items: function (newVal, oldVal) {
            this.sortBy = null;
            this.sort(this.$props.keyfield);
        }
    },
    template: `<table class="sortable-table">
        <thead>
            <tr>
                <slot></slot>
            </tr>
        </thead>
        <tbody>
            <tr v-for="item in sorted" :key="item[keyfield]" :style="{ 'cursor': clickable ? 'pointer' : 'initial' }">
                <td v-for="field in fields" :key="field.name"><a @click="$emit('rowclick', item)">{{ item[field.name] }}</a></td>
            </tr>
            <tr v-if="sorted.length === 0">
                <td :colspan="fields.length">No items to display</td>
            </tr>
        </tbody>
    </table>`
});

Vue.component('sortable-table-column', {
    props: ['field', 'sort'],
    template: `<th @click="$parent.sort(field)"><slot></slot></th>`
});

Vue.directive('tooltip', {
    bind: (el, binding) => {
        const tooltip = document.createElement('div');
        tooltip.appendChild(document.createTextNode(binding.value));
        tooltip.className = 'tooltip';
        el.appendChild(tooltip);

        el.addEventListener('mouseenter', evt => {
            tooltip.style.display = 'block';
        });
        el.addEventListener('mouseleave', evt => {
            tooltip.style.display = 'none';
        });
        el.addEventListener('mousemove', evt => {
            // check if tooltip is going out of screen
            const rect = tooltip.getBoundingClientRect();
            let offsetX = (evt.clientX + rect.width) - window.innerWidth;
            let offsetY = (evt.clientY + rect.height) - window.innerHeight;
            if (offsetX < 0) offsetX = 0;
            if (offsetY < -8) offsetY = -8;

            tooltip.style.left = (evt.clientX - offsetX) + 'px';
            tooltip.style.top = (evt.clientY - offsetY) + 'px';
        });

        el.$tooltip = tooltip;
    },
    update: (el, binding) => {
        el.$tooltip.removeChild(el.$tooltip.firstChild);
        el.$tooltip.appendChild(document.createTextNode(binding.value));
    }
});

Vue.directive('context-menu', {
    bind: (el, binding, vnode) => {
        const menu = Vue.prototype.$contextMenu;

        el.addEventListener('contextmenu', evt => {
            if (!evt.shiftKey) {
                evt.preventDefault();
                evt.stopPropagation();

                menu.context = binding.value.context;
                menu.menu = menu._MENUS[binding.value.menuType];

                el.appendChild(menu.$el);

                menu.$el.style.display = 'block';

                const rect = menu.$el.getBoundingClientRect();
                let offsetX = (evt.clientX + rect.width) - window.innerWidth;
                let offsetY = (evt.clientY + rect.height) - window.innerHeight;
                if (offsetX < 0) offsetX = 0;
                if (offsetY < -8) offsetY = -8;

                menu.$el.style.left = (evt.clientX - offsetX) + 'px';
                menu.$el.style.top = (evt.clientY - offsetY) + 'px';
            }
        });
    },
    /*update: (el, binding) => {
        el.$tooltip.removeChild(el.$tooltip.firstChild);
        el.$tooltip.appendChild(document.createTextNode(binding.value));
    }*/
});

/* app components */
Vue.component('terminal', {
    props: ['appInstance'],
    data: () => ({
        input: ''
    }),
    mounted: function () {
        this.$refs.input.focus();
    },
    updated: function () {
        this.$el.parentElement.scrollTop = this.$el.parentElement.scrollHeight;
    },
    beforeDestroy: function () {
        this.appInstance.destroy();
    },
    methods: {
        sendInput: function (evt) {
            if (evt.keyCode === 13) {
                const line = this.input;
                this.input = '';

                if (line === 'exit') {
                    this.$emit('exit');
                }
                else {
                    this.appInstance.lines.push(line);
                    this.appInstance.enterLine(line);
                }
            }
        }
    },
    template: `<div class="terminal">
        <div v-for="(line, index) in appInstance.lines" :key="index">{{ line }}</div>
        <div>
            <input ref="input" type="text" v-model="input" @keyup.enter="sendInput"/>
        </div>
    </div>`
});

class FileSystemNode {
    constructor(type, name, parent = null) {
        this.type = type;
        this.name = name;  // name is not necessary (because this node will be mapped via the name) but we also add it here for easy access
        this.parent = parent;
        this.children = {};
    }

    getNode(tokens) {
        if (tokens.length == 0) return this;
        if (tokens[0] == '') return this.getNode(tokens.slice(1));
        if (!this.children[tokens[0]]) throw new Error(tokens[0] + " does not exist");
        if (tokens.length == 1) return this.children[tokens[0]];
        if (this.children[tokens[0]].type === 'file') throw new Error("Cannot get " + tokens.slice(1).join('/') + " at " + tokens[0] + ", which is a file");
        return (this.children[tokens[0]]).getNode(tokens.slice(1));
    }

    getAbsolutePath() {
        return this.parent ? this.parent.getAbsolutePath() + '/' + this.name : this.name;
    }
}

Vue.component('file-system-viewer', {
    inject: [ '$alert' ],
    data: () => ({
        cwd: '/',
        tree: new FileSystemNode('directory', ''),
        curNode: null,
        selectedNode: null
    }),
    computed: {
        sortedChildren: function () {
            if (!this.curNode) return [];

            return Object.values(this.curNode.children).sort((a, b) => {
                if (a.type === b.type) return a.name < b.name ? -1 : 1;
                else return a.type === 'directory' ? -1 : 1;
            });
        }
    },
    methods: {
        viewDirectory: function (abspath) {
            ajax.get('/fs' + abspath).then(resp => {
                const tokens = abspath.split('/').slice(1);

                const node = this.tree.getNode(tokens);

                const children = resp.reduce((acc, item) => {
                    acc[item.name] = new FileSystemNode(item.type, item.name, node);
                    return acc;
                }, {});

                node.children = children;

                this.cwd = abspath;
                this.curNode = node;
            });
        },
        viewFile: function (abspath) {
            ajax.get('/fs' + abspath, true).then(resp => {
                const ext = abspath.split('.').reverse()[0];

                if (TextEditor.SUPPORTED_FILE_TYPES.includes(resp.type) || ext === 'osh') {
                    resp.text().then(text => {
                        this.$root.openApp('textEditor', {
                            filePath: abspath,
                            content: text
                        });
                    });
                }
                else if (ImageViewer.SUPPORTED_FILE_TYPES.includes(resp.type)) {
                    this.$root.openApp('imageViewer', {
                        filePath: abspath,
                        content: URL.createObjectURL(resp)
                    });
                }
                else {
                    this.$alert(`File type ${resp.type} is not supported yet`);
                }
                
            });
        },
        selectNode: function (node) {
            if (this.selectedNode === node) {
                if (node.type === 'directory') {
                    this.viewDirectory(node.getAbsolutePath());
                }
                else if (node.type === 'file') {
                    this.viewFile(node.getAbsolutePath());
                }
            }
            else {
                this.selectedNode = node;
            }
        }
    },
    mounted: function () {
        this.viewDirectory('/');
    },
    template: `<div class="fs-viewer">
        <div class="fs-tree">
            <file-system-tree-node v-for="(node, name) in tree.children" :key="name"
                @select="selectNode" :node="node" :selected="selectedNode"></file-system-tree-node>
        </div>
        <div class="fs-dir">
            <div class="address-bar">{{ cwd }}</div>
            <div v-if="curNode" class="content">
                <div v-for="(node, index) in sortedChildren" :key="index" @click="selectNode(node)" :class="{ selected: selectedNode === node }">
                    <span class="icon-1-5" :class="(node.type === 'directory' ? 'icon-folder' : 'icon-file')"></span>
                    <span>{{ node.name }}</span>
                </div>
            </div>
        </div>
    </div>`
});

Vue.component('file-system-tree-node', {
    props: ['node', 'selected'],
    computed: {
        sortedChildren: function () {
            return Object.values(this.node.children).sort((a, b) => {
                if (a.type === b.type) return a.name < b.name ? -1 : 1;
                else return a.type === 'directory' ? -1 : 1;
            });
        }
    },
    template: `<div class="fs-node" :class="{ selected: selected === node }">
        <div @click="$emit('select', node)">
            <span class="icon-1" :class="(node.type === 'directory' ? 'icon-folder' : 'icon-file')"></span>
            <span>{{ node.name }}</span>
        </div>
        <div v-if="sortedChildren.length > 0" class="fs-node-children">
            <file-system-tree-node v-for="(child, index) in sortedChildren" :key="index"
                @select="$emit('select', child)" :node="child" :selected="selected"></file-system-tree-node>
        </div>
    </div>`
});

Vue.component('text-editor', {
    props: [ 'appInstance' ],
    /*data: () => ({
        filePath: '',
        content: ''
    }),
    created: function () {
        if (this.appInstance) {
            this.filePath = this.appInstance.filePath;
            this.content = this.appInstance.content;

            this.appInstance.contentUpdated = false;
        }
    },*/
    updated: function () {
        this.appInstance.contentUpdated = true;
    },
    template: `<div class="text-editor">
        <textarea v-model="appInstance.content"></textarea>
    </div>`
});

Vue.component('image-viewer', {
    props: [ 'appInstance' ],
    template: `<div class="image-viewer">
        <img v-if="appInstance.content" :src="appInstance.content"/>
    </div>`
});

Vue.component('video-viewer', {
    props: [ 'deviceUri' ],
    mounted: function () {
        const video = this.$refs.viewer;

        const socket = new WebSocket('ws://' + window.location.host + '/ws');
        socket.binaryType = 'arraybuffer';

        socket.addEventListener('open', evt => {
            socket.send(JSON.stringify({
                connection: 'VideoInput',
                uri: this.deviceUri
            }));

            socket.addEventListener('message', evt => {
                video.src = 'data:image/jpeg;base64,' + btoa(new Uint8Array(evt.data).reduce((acc, item) => acc + String.fromCharCode(item), ''));
            });
        });

        this.socket = socket;
    },
    beforeDestroy: function() {
        this.socket.close();
    },
    template: `<div style="display:flex;justify-content:center;"><img ref="viewer"/></div>`
});

Vue.component('io-monitor', {
    props: [ 'appInstance' ],
    data: () => ({
        deviceType: '',
        deviceUri: ''
    }),
    created: function () {
        if (this.appInstance) {
            this.deviceType = this.appInstance.deviceType;
            this.deviceUri = this.appInstance.deviceUri;
        }
    },
    template: `<div class="io-monitor">
        <video-viewer v-if="deviceType === 'video-in'" :device-uri="deviceUri"></video-viewer>
    </div>`
});

Vue.component('agent-monitor', {
    props: ['appInstance'],
    data: () => ({
        agentUri: '',
        series: []
    }),
    methods: {
        __initGraph: function () {
            this.d3 = {};

            // Main svg
            const svg = d3.select(this.$refs.graph)
                .append('svg')
                .attr('width', this.$refs.graph.parentNode.clientWidth)
                .attr('height', this.$refs.graph.parentNode.clientHeight);

            const elemBox = svg.node().getBoundingClientRect();

            const margin = { left: 50, right: 50, top: 30, bottom: 50 };
            const size = { width: elemBox.width - margin.left - margin.right, height: elemBox.height - margin.top - margin.bottom };

            // The Axes
            const axes = svg.append('g')
                .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

            const xScale = d3.scaleLinear().domain([0, 100]).range([0, size.width]);
            const yLeftScale = d3.scaleLinear().domain([0, 100]).range([size.height, 0]);
            const yRightScale = d3.scaleLinear().domain([0, 100]).range([size.height, 0]);

            //const xAxis = d3.axisBottom(xScale).ticks(Math.floor(elemBox.width / 100)).tickFormat(d3.timeFormat('%H:%M:%S'));
            const relativeTimeFormat = val => `${String(Math.floor(val / 3600)).padStart(2, '0')}:${String(Math.floor((val % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(val % 60)).padStart(2, '0')}`;
            const preciseTimeFormat = val => `${String(Math.floor(val / 3600)).padStart(2, '0')}:${String(Math.floor((val % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(val % 60)).padStart(2, '0')}:${String(Math.round(1000 * (val - Math.floor(val)))).padStart(3, '0')}`;
            const xAxis = d3.axisBottom(xScale).ticks(Math.floor(elemBox.width / 100)).tickFormat(relativeTimeFormat);
            const yLeftAxis = d3.axisLeft(yLeftScale).tickFormat(d => Math.floor(d) + ' MB');
            const yRightAxis = d3.axisRight(yRightScale).tickFormat(d => Math.floor(d) + ' %');

            const xLine = axes.append('g').attr('transform', 'translate(0, ' + size.height + ')').call(xAxis);
            const yLeftLine = axes.append('g').call(yLeftAxis);
            const yRightLine = axes.append('g').attr('transform', 'translate(' + size.width + ', 0)').call(yRightAxis);

            // Grid
            const grid = svg.append('g').attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');

            const mouseTrackV = grid.append('line')
                .attr('x1', 0)
                .attr('x2', 0)
                .attr('y1', 0)
                .attr('y2', size.height)
                .attr('style', 'stroke: rgb(220,180,180); stroke-width: 1;');
            const mouseTrackH = grid.append('line')
                .attr('x1', 0)
                .attr('x2', size.width)
                .attr('y1', 0)
                .attr('y2', 0)
                .attr('style', 'stroke: rgb(220,180,180); stroke-width: 1;');
            const mouseTrackCpu = grid.append('line')
                .attr('x1', 0)
                .attr('x2', size.width)
                .attr('y1', 0)
                .attr('y2', 0)
                .attr('style', 'stroke: rgb(220,180,180); stroke-width: 1;');
            const mouseTrackCircle = grid.append('circle')
                .attr('cx', 0)
                .attr('cy', 0)
                .attr('r', 2)
                .attr('fill', 'steelblue');
            const mouseTrackCpuCircle = grid.append('circle')
                .attr('cx', 0)
                .attr('cy', 0)
                .attr('r', 2)
                .attr('fill', 'red');
            const mouseText = grid.append('text')
                .attr('x', 0)
                .attr('y', 0);
            const mousePointerText = grid.append('text')
                .attr('x', 0)
                .attr('y', 0);
            const mouseCpuPointerText = grid.append('text')
                .attr('x', 0)
                .attr('y', 0);

            /*const mouseCursor = grid.append('line')
                .attr('x1', 0)
                .attr('x2', 0)
                .attr('y1', 0)
                .attr('y2', size.height);
            const cursorText = grid.append('text').attr('x', 0).attr('y', 0)*/

            svg.on('mousemove', (evt) => {
                const mousePos = d3.pointer(evt, grid.node());
                //const timestamp = d3.timeFormat('%H:%M:%S.%L')(xScale.invert(mousePos[0]));
                const timestamp = xScale.invert(mousePos[0]);
                // find the closest datapoint
                const point = this.series.find(item => Math.abs(item.timestamp - timestamp) < 0.125);

                // console.log(mousePos);
                mouseTrackV.attr('x1', mousePos[0]).attr('x2', mousePos[0]);
                mouseText.attr('x', mousePos[0])
                    .text(preciseTimeFormat(timestamp));

                if (point) {
                    const yMemVal = yLeftScale(point.memory / 1000000);
                    const yCpuVal = yRightScale(point.cpu * 100);
                    mouseTrackH.attr('y1', yMemVal).attr('y2', yMemVal);
                    mouseTrackCircle.attr('cx', mousePos[0]).attr('cy', yMemVal);
                    mouseTrackCpu.attr('y1', yCpuVal).attr('y2', yCpuVal);
                    mouseTrackCpuCircle.attr('cx', mousePos[0]).attr('cy', yCpuVal);

                    mousePointerText.attr('x', mousePos[0]).attr('y', yMemVal + 20)
                        .text((point.memory / 1000000).toFixed(3) + ' MB');
                    mouseCpuPointerText.attr('x', mousePos[0]).attr('y', yCpuVal - 20)
                        .text((point.cpu * 100).toFixed(2) + ' %');
                }
            });

            this.d3.view = { from: null, to: null };
            svg.on('wheel', (evt) => {
                const mousePos = d3.pointer(evt, grid.node());
                const domain = xScale.domain();
                if (evt.deltaY < 0) {
                    const zoom = (domain[1] - domain[0]) * 0.8;
                    //this.d3.view.from = domain[0] + (domain[1] - domain[0] - zoom) / 2;
                    this.d3.view.from = xScale.invert(mousePos[0]) - zoom / 2;
                    if (this.d3.view.from < 0) this.d3.view.from = 0;
                    this.d3.view.to = this.d3.view.from + zoom;
                }
                else {
                    const zoom = (domain[1] - domain[0]) / 0.8;
                    //this.d3.view.from = domain[0] - (zoom - domain[1] + domain[0]) / 2;
                    this.d3.view.from = xScale.invert(mousePos[0]) - zoom / 2;
                    if (this.d3.view.from < 0) this.d3.view.from = 0;
                    this.d3.view.to = this.d3.view.from + zoom;
                }

                this.__updateGraph();
            });

            /*svg.on('mouseup', (evt) => {
                const mousePos = d3.pointer(evt, grid.node());
                this.d3.cursorAt = xScale.invert(mousePos[0]);
                // console.log(mousePos, Math.floor(x.invert(mousePos[0])));
                mouseCursor.attr('x1', mousePos[0]).attr('x2', mousePos[0])
                    .attr('style', 'stroke: rgb(100,100,255); stroke-width: 2;');
                cursorText.attr('x', mousePos[0]).text(preciseTimeFormat(this.d3.cursorAt));
            });*/

            // Elements that will represent incoming data
            const plot = svg.append('g').attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')');
            const memoryFunc = this.d3.memoryFunc = d3.line()
                .x((d, i) => xScale(d.timestamp))
                .y((d, i) => yLeftScale(d.memory / 1000000));
            const cpuFunc = this.d3.cpuFunc = d3.line()
                .x((d, i) => xScale(d.timestamp))
                .y((d, i) => yRightScale(d.cpu * 100));

            const memoryLine = plot.append('path')
                .datum(this.series)
                .attr('class', 'line')
                .attr('fill', 'none')
                .attr('stroke', 'steelblue')
                .attr('stroke-width', 1.5)
                .attr('d', memoryFunc);
            const cpuLine = plot.append('path')
                .datum(this.series)
                .attr('class', 'line')
                .attr('fill', 'none')
                .attr('stroke', 'red')
                .attr('stroke-width', 1.5)
                .attr('d', cpuFunc);

            const colors = d3.scaleOrdinal(d3.schemeCategory10);

            this.d3.xScale = xScale;
            this.d3.yLeftScale = yLeftScale;
            this.d3.yRightScale = yRightScale;
            this.d3.xAxis = xAxis;
            this.d3.yLeftAxis = yLeftAxis;
            this.d3.yRightAxis = yRightAxis;
            this.d3.xLine = xLine;
            this.d3.yLeftLine = yLeftLine;
            this.d3.yRightLine = yRightLine;

            this.d3.memoryLine = memoryLine;
            this.d3.cpuLine = cpuLine;

            /*this.d3.svg = svg;
            this.d3.elemBox = elemBox;
            this.d3.margin = margin;
            this.d3.size = size;
            this.d3.view = { from: 0, to: 0 };
            this.d3.axes = axes;
            
            this.d3.grid = grid;
            this.d3.cursor = mouseCursor;
            this.d3.cursorText = cursorText;

            this.d3.panLeft = () => {
                var domain = x.domain();
                var zoom = domain[1] - domain[0];
                var panStep = zoom * 0.1;
                this.d3.view.from = domain[0] - panStep;
                this.d3.view.to = this.d3.view.from + zoom;
                this.__redraw_d3()
            }
            this.d3.panRight = () => {
                var domain = x.domain();
                var zoom = domain[1] - domain[0];
                var panStep = zoom * 0.1;
                this.d3.view.from = domain[0] + panStep;
                this.d3.view.to = this.d3.view.from + zoom;
                this.__redraw_d3()
            }
            this.d3.zoomIn = () => {
                var domain = x.domain();
                var zoom = (domain[1] - domain[0]) * 0.8;
                var panStep = zoom * 0.1;
                this.d3.view.from = domain[0] + (domain[1] - domain[0] - zoom) / 2;
                this.d3.view.to = this.d3.view.from + zoom;
                this.__redraw_d3()
            }
            this.d3.zoomOut = () => {
                var domain = x.domain();
                var zoom = (domain[1] - domain[0]) / 0.8;
                var panStep = zoom * 0.1;
                this.d3.view.from = domain[0] - (zoom - domain[1] + domain[0]) / 2;
                this.d3.view.to = this.d3.view.from + zoom;
                this.__redraw_d3()
            }
            this.d3.resetView = () => {
                this.d3.view.from = 0;
                this.d3.view.to = 0;
                this.__redraw_d3()
            }

            
            this.d3.colors = colors;
            this.d3.lines = {};
            this.d3.data = {};
            this.d3.maxValue = -Infinity;
            this.d3.minValue = Infinity;*/
        },
        __updateGraph: function () {
            if (this.d3.view.from !== null && this.d3.view.to !== null) {
                this.d3.xScale.domain([this.d3.view.from, this.d3.view.to]);
            }
            else {
                this.d3.xScale.domain(d3.extent(this.series, d => d.timestamp));
            }
            this.d3.yLeftScale.domain([0, d3.max(this.series, d => d.memory / 1000000) * 1.1 ]);

            this.d3.xLine.call(this.d3.xAxis);
            this.d3.yLeftLine.call(this.d3.yLeftAxis);

            this.d3.memoryLine.datum(this.series).attr('d', this.d3.memoryFunc);
            this.d3.cpuLine.datum(this.series).attr('d', this.d3.cpuFunc);
        },
        resetView: function () {
            this.d3.view.from = null;
            this.d3.view.to = null;
        }
    },
    created: function () {
        if (this.appInstance) {
            this.agentUri = this.appInstance.agentUri;
        }
    },
    mounted: function () {
        const socket = new WebSocket('ws://' + window.location.host + '/ws');
        socket.binaryType = 'arraybuffer';

        socket.addEventListener('open', evt => {
            socket.send(JSON.stringify({
                connection: 'AgentMonitor',
                uri: this.agentUri
            }));

            socket.addEventListener('message', evt => {
                const decoder = new TextDecoder('utf-8');
                const message = decoder.decode(evt.data);
                const tokens = message.split(',');
                const stat = {
                    timestamp: parseFloat(tokens[0]),
                    cpu: parseFloat(tokens[3]),
                    memory: parseInt(tokens[4]),
                    bytesIn: parseInt(tokens[6]),
                    bytesOut: parseInt(tokens[7]),
                    messagesIn: parseInt(tokens[8]),
                    messagesOut: parseInt(tokens[9]),
                    rateIn: parseFloat(tokens[10]),
                    rateOut: parseFloat(tokens[11])
                };

                this.series.push(stat);

                this.__updateGraph();
            });
        });

        this.socket = socket;

        this.__initGraph();
    },
    beforeDestroy: function () {
        this.socket.close();
    },
    template: `<div class="agent-monitor">
        <div>
            Agent: {{ agentUri }}
        </div>
        <div>
            <button>CPU</button>
            <button>Memory</button>
            <button>BytesIn</button>
            <button>BytesOut</button>
            <button @click="resetView">Reset View</button>
        </div>
        <div ref="graph"></div>
    </div>`
});

Vue.component('resource-monitor', {
    inject: ['$alert'],
    data: () => ({
        agents: [],
        pipes: [],
        sockets: [],
        io: [],
        runtimes: []
    }),
    methods: {
        getAllAgents: function () {
            ajax.get('/runtime/agents').then(resp => {
                this.agents = resp;
            });
        },
        getAllPipes: function () {
            ajax.get('/runtime/pipes').then(resp => {
                this.pipes = resp;
            });
        },
        getAllRuntimes: function () {
            ajax.get('/runtime/runtimes').then(resp => {
                this.runtimes = resp;
            });
        },
        getAllSockets: function () {
            ajax.get('/runtime/sockets').then(resp => {
                this.sockets = resp;
            });
        },
        getAllIO: function () {
            ajax.get('/runtime/io').then(resp => {
                this.io = resp;
            });
        },
        viewAgent: function (agent) {
            if (AgentMonitor.KERNEL_AGENTS.includes(agent.uri)) {
                this.$alert(`Kernel Agent "${agent.uri}" cannot be monitored`);
            }
            else {
                setTimeout(() => {
                    this.$root.openApp('agentMonitor', {
                        agentUri: agent.uri
                    });
                });
            }
        },
        viewIODevice: function (ioDevice) {
            setTimeout(() => {
                this.$root.openApp('ioMonitor', {
                    deviceType: ioDevice.deviceType,
                    deviceUri: ioDevice.uri
                });
            });
        }
    },
    mounted: function () {
        this.getAllAgents();
        this.getAllPipes();
        this.getAllRuntimes();
        this.getAllSockets();
        this.getAllIO();

        const socket = new WebSocket('ws://' + window.location.host + '/ws');

        socket.addEventListener('open', evt => {
            socket.send(JSON.stringify({
                connection: 'ResourceMonitor'
            }));

            socket.addEventListener('message', evt => {
                const message = JSON.parse(evt.data);
                console.log(message);
                if (message.type === 'runtime-leave') {
                    const runtime = this.runtimes.find(item => item.uri === message.data);
                    if (runtime) {
                        runtime.status = 'Dead';
                        //this.$set(runtime, 'status', 'Dead');
                    }
                }
                else if (message.type === 'runtime-join') {
                    const runtime = this.runtimes.find(item => item.uri === message.data);
                    if (runtime) {
                        runtime.status = 'Alive';
                        //this.$set(runtime, 'status', 'Dead');
                    }
                }
                else if (message.type === 'agent-leave') {
                    const index = this.agents.findIndex(item => item.uri === message.data);
                    this.agents.splice(index, 1);
                }
                else if (message.type === 'agent-join') {
                    const agent = this.agents.find(item => item.uri === message.data.uri);
                    if (agent) {
                        agent.runtime = message.data.runtime;
                    }
                    else {
                        this.agents.push(message.data);
                    }
                }
            });
        });

        this.socket = socket;
    },
    beforeDestroy: function () {
        this.socket.close();
    },
    template: `<div class="resource-monitor">
        <tabs>
            <tab label="Agents">
                <div class="padding-1 bg-1">
                    <sortable-table :items="agents" keyfield="uri" @rowclick="viewAgent" clickable="true">
                        <sortable-table-column field="uri">Agent URI</sortable-table-column>
                        <sortable-table-column field="pid">PID</sortable-table-column>
                        <sortable-table-column field="runtime">Runtime</sortable-table-column>
                    </sortable-table>
                </div>
            </tab>
            <tab label="Pipes">
                <div class="padding-1 bg-1">
                    <sortable-table :items="pipes" keyfield="key">
                        <sortable-table-column field="key">Key</sortable-table-column>
                        <sortable-table-column field="type">Type</sortable-table-column>
                        <sortable-table-column field="group">Group</sortable-table-column>
                        <sortable-table-column field="orderBy">Order By</sortable-table-column>
                        <sortable-table-column field="source">Source</sortable-table-column>
                        <sortable-table-column field="sink">Sink</sortable-table-column>
                    </sortable-table>
                </div>
            </tab>
            <tab label="Sockets">
                <div class="padding-1 bg-1">
                    <sortable-table :items="sockets" keyfield="port">
                        <sortable-table-column field="port">Port</sortable-table-column>
                        <sortable-table-column field="owner">Owner</sortable-table-column>
                        <sortable-table-column field="hostRuntime">Host Runtime</sortable-table-column>
                    </sortable-table>
                </div>
            </tab>
            <tab label="IO">
                <div class="padding-1 bg-1">
                    <sortable-table :items="io" keyfield="uri" @rowclick="viewIODevice" clickable="true">
                        <sortable-table-column field="uri">URI</sortable-table-column>
                        <sortable-table-column field="deviceType">Device Type</sortable-table-column>
                        <sortable-table-column field="driver">Driver</sortable-table-column>
                        <sortable-table-column field="hostRuntime">Host Runtime</sortable-table-column>
                    </sortable-table>
                </div>
            </tab>
            <tab label="Runtimes">
                <div class="padding-1 bg-1">
                    <sortable-table :items="runtimes" keyfield="uri">
                        <sortable-table-column field="uri">Runtime URI</sortable-table-column>
                        <sortable-table-column field="status">Status</sortable-table-column>
                        <sortable-table-column field="agents">Agents</sortable-table-column>
                        <sortable-table-column field="cores">Cores</sortable-table-column>
                        <sortable-table-column field="clockSpeed">Clock Speed (MHz)</sortable-table-column>
                        <sortable-table-column field="memoryMB">Memory (MB)</sortable-table-column>
                        <sortable-table-column field="diskMB">Disk (MB)</sortable-table-column>
                    </sortable-table>
                </div>
            </tab>
        </tabs>
    </div>`
});

class AppMenuItem {
    constructor(label, icon, onClick) {
        this.label = label;
        this.icon = icon;
        this.onClick = onClick || (evt => null);
        this.submenu = [];
    }

    // chainable
    add(label, icon, onClick) {
        this.submenu.push(new AppMenuItem(label, icon, onClick));
        return this;
    }
}

class WebTerminalApp {
    constructor(title, componentTagName) {
        this.id = randstr();
        this.title = title;
        this.componentTagName = componentTagName;
        this.isMinimized = false;
        this.isBusy = false;
        this.menu = [];
    }
}

class Terminal extends WebTerminalApp {
    constructor() {
        super('Terminal', 'terminal');

        const socket = new WebSocket('ws://' + window.location.host + '/ws');
        socket.addEventListener('open', evt => {
            socket.send(JSON.stringify({
                connection: 'UserShell'
            }));
            this.connected = true;

            socket.addEventListener('message', evt => {
                const message = JSON.parse(evt.data);
                message.line.split('\n').forEach(line => {
                    this.lines.push(line);
                });
            });
        });

        this.socket = socket;
        this.connected = false;

        this.lines = [];
    }

    enterLine(line) {
        this.socket.send(JSON.stringify({ line: line }));
    }

    destroy() {
        this.socket.close();
    }
}

class ResourceMonitor extends WebTerminalApp {
    constructor() {
        super('Resource Monitor', 'resource-monitor');
    }
}

class FileSystemViewer extends WebTerminalApp {
    constructor() {
        super('File System Viewer', 'file-system-viewer');
    }
}

class TextEditor extends WebTerminalApp {
    constructor(kwargs) {
        super('Text Editor', 'text-editor');

        if (kwargs) {
            this.filePath = kwargs.filePath;    // the absolute path of the file to open
            this.content = kwargs.content;
        }

        const fileMenu = new AppMenuItem('File', null, null);
        fileMenu.add('New', 'file-new', () => this.newFile())
            .add('Open', 'file-open', null)
            .add('Save', 'file-save', () => this.saveFile())
            .add('Save As', 'file-save-as', null);
        this.menu.push(fileMenu);

        const editMenu = new AppMenuItem('Edit', null, null);
        editMenu.add('Cut', 'file-cut', null)
            .add('Copy', 'file-copy', null)
            .add('Paste', 'file-paste', null);
        this.menu.push(editMenu);
    }

    newFile() {
        console.log(this);
        if (this.contentUpdated) {
            this.$confirm('There are unsaved changes. Are you sure?')
                .then(() => {
                    this.filePath = null;
                    this.content = '';
                    this.contentUpdated = false;
                }).catch(() => {
                    // do nothing;
                });
        }
        else {
            this.filePath = null;
            this.content = '';
        }
    }

    saveFile() {
        if (this.filePath) {
            this.isBusy = true;
            ajax.post('/fs' + this.filePath, {
                mode: 'w',
                content: this.content
            }).then(() => {
                this.contentUpdated = false;
            }).finally(() => {
                this.isBusy = false;
            });
        }
        else {
            this.$alert('Specify the file path');
        }
    }
}
TextEditor.SUPPORTED_FILE_TYPES = ['application/javascript', 'application/json', 'text/plain', 'text/html', 'text/csv'];

class ImageViewer extends WebTerminalApp {
    constructor(kwargs) {
        super('Image Viewer', 'image-viewer');

        if (kwargs) {
            this.filePath = kwargs.filePath;    // the absolute path of the file to open
            this.content = kwargs.content;
        }
    }
}
ImageViewer.SUPPORTED_FILE_TYPES = ['image/jpeg', 'image/png'];

class IOMonitor extends WebTerminalApp {
    constructor(kwargs) {
        super('IO Monitor', 'io-monitor');
        if (kwargs) {
            this.deviceType = kwargs.deviceType;
            this.deviceUri = kwargs.deviceUri;
        }
    }
}

class AgentMonitor extends WebTerminalApp {
    constructor(kwargs) {
        super('Agent Monitor', 'agent-monitor');
        if (kwargs) {
            this.agentUri = kwargs.agentUri;
        }
    }
}
AgentMonitor.KERNEL_AGENTS = ['SessionManager', 'RegistryManager'];

// WebRuntime is a follower-only OneOS runtime that can run workloads in WebWorker threads.
// This can be activated by the user
class WebRuntime {
    constructor() {
        this.agents = new Map();
    }
}

window.addEventListener('load', () => {
    console.log('Starting OneOS Web Terminal');

    const userdata = {
        username: null,
        desktop: new FileSystemNode('directory', 'Desktop')
    };
    ajax.get('/me').then(data => {
        userdata.username = data.username;
        userdata.desktop.name = '/home/' + data.username + '/Desktop';   // update name to make getAbsolutePath work without root directory

        ajax.get('/fs' + userdata.desktop.getAbsolutePath()).then(resp => {

            const children = resp.reduce((acc, item) => {
                acc[item.name] = new FileSystemNode(item.type, item.name, userdata.desktop);
                return acc;
            }, {});

            userdata.desktop.children = children;
        });
    });

    const appRegistry = {
        'terminal': Terminal,
        'resourceMonitor': ResourceMonitor,
        'fsViewer': FileSystemViewer,
        'textEditor': TextEditor,
        'imageViewer': ImageViewer,
        'ioMonitor': IOMonitor,
        'agentMonitor': AgentMonitor
    };

    Vue.prototype.$eventBus = new (Vue.extend({}));
    const contextMenu = new (Vue.extend({
        data: () => ({
            context: null,
            menu: []
        }),
        methods: {
            clickItem: function (evt, item) {
                item.onClick(this.context);
                this._hide();

                evt.stopPropagation();
            }
        },
        template: `<div class="context-menu">
        <div v-for="item in menu" class="menu-item">
            <a @click="clickItem($event, item)">{{ item.label }}</a>
        </div>
    </div>`
    }));
    contextMenu._MENUS = {
        'desktop': [
            new AppMenuItem('Paste', null, item => console.log(item)),
            new AppMenuItem('New', null, item => console.log(item))
        ],
        'fsViewer-file': [
            new AppMenuItem('Cut', null, item => console.log(item)),
            new AppMenuItem('Copy', null, item => console.log(item))
        ]
    };
    contextMenu._hide = evt => {
        contextMenu.$el.style.display = 'none';
        if (contextMenu.$el.parentElement) contextMenu.$el.parentElement.removeChild(contextMenu.$el);
    };
    contextMenu.$mount(document.createElement('div'));
    contextMenu.$eventBus.$on('clickOutside', contextMenu._hide);
    Vue.prototype.$contextMenu = contextMenu;

    const app = new Vue({
        el: '#app',
        data: () => ({
            userdata: userdata,
            openMenu: null,
            apps: [],
            activeApp: null,
            wallpaper: {
                type: 'css',
                value: 'wallpaper-spring'
            },
            searchOpen: false,
            searchText: '',
            selectedFSNode: null
        }),
        methods: {
            toggleMenu: function (evt, name) {
                if (this.openMenu !== name) this.openMenu = name;
                else this.openMenu = null;
                evt.stopPropagation();

                this.searchOpen = false;
            },
            toggleSearchBar: function (evt) {
                this.searchOpen = !this.searchOpen;
                evt.stopPropagation();
            },
            onClickOutside: function (evt) {
                this.openMenu = null;
                this.selectedFSNode = null;
                console.log('clickOutside');
                this.$eventBus.$emit('clickOutside', evt);
            },
            openApp: function (appId, kwargs) {
                const appClass = appRegistry[appId];
                if (appClass) {
                    const appInstance = new appClass(kwargs);
                    this.apps.push(appInstance);
                    this.activeApp = appInstance;
                }
                else {
                    console.error('App does not exist');
                }
            },
            closeApp: function (appInstance) {
                let index = this.apps.indexOf(appInstance);
                if (index > -1) {
                    this.apps.splice(index, 1);
                }
                else {
                    console.error('App Instance does not exist');
                }
            },
            selectApp: function (appInstance) {
                this.activeApp = appInstance;
                appInstance.isMinimized = false;
            },
            selectFSNode: function (evt, node) {
                if (this.selectedFSNode === node) {
                    if (node.type === 'directory') {
                        //this.viewDirectory(node.getAbsolutePath());
                    }
                    else if (node.type === 'file') {
                        const abspath = node.getAbsolutePath();
                        ajax.get('/fs' + abspath, true).then(resp => {

                            if (TextEditor.SUPPORTED_FILE_TYPES.includes(resp.type)) {
                                resp.text().then(text => {
                                    this.openApp('textEditor', {
                                        filePath: abspath,
                                        content: text
                                    });
                                });
                            }
                            else {
                                alert(`File type ${resp.type} is not supported yet`);
                            }

                        });
                    }
                }
                else {
                    this.selectedFSNode = node;
                }
                evt.stopPropagation();
            }
        },
        template: `<div style="position:fixed; width:100%; height:100%;" @click.bubble="onClickOutside">
            <div class="navigation-bar flex row">
                <div class="dropdown" :class="{ 'active': this.openMenu === 'main' }">
                    <div class="dropdown-button start-button" v-tooltip="'Start'">
                        <span @click="toggleMenu($event, 'main')" class="icon-1-5 icon-white icon-launch"></span>
                    </div>
                    <div class="dropdown-menu">
                        <div class="menu-item">
                            <a @click="openApp('terminal')">Terminal</a>
                        </div>
                        <div class="menu-item">
                            <a @click="openApp('textEditor')">Text Editor</a>
                        </div>
                        <div class="menu-item">
                            <a @click="openApp('fsViewer')">File System</a>
                        </div>
                        <div class="menu-item">
                            <a @click="openApp('ioMonitor')">I/O Monitor</a>
                        </div>
                        <div class="menu-item">
                            <a @click="openApp('resourceMonitor')">Resource Monitor</a>
                        </div>
                        <hr/>
                        <div class="menu-item">
                            <a href="/logout">
                                Log Out
                            </a>
                        </div>
                    </div>
                </div>
                <div class="grow-1 flex row">
                    <div :key="instance.id" v-for="instance in apps" class="app-menu" :class="{ active: activeApp === instance }" @click="selectApp(instance)">{{ instance.title }}</div>
                </div>
                <div class="flex row">
                    <div style="margin-left:1em;">
                        <a v-tooltip="'Search OneOS'" @click="toggleSearchBar">
                            <span class="icon-1 icon-white icon-search"></span>
                        </a>
                    </div>
                    <div class="dropdown" :class="{ 'active': this.openMenu === 'settings' }" style="margin-left:1em;">
                        <div class="dropdown-button" v-tooltip="'Settings'">
                            <span @click="toggleMenu($event, 'settings')" class="icon-1 icon-white icon-config"></span>
                        </div>
                        <div class="dropdown-menu right">
                            <div class="menu-item">
                                Wallpaper
                            </div>
                        </div>
                    </div>
                    <div class="dropdown" :class="{ 'active': this.openMenu === 'user' }" style="margin-left:1em;">
                        <div class="dropdown-button" v-tooltip="'About ' + userdata.username">
                            <span @click="toggleMenu($event, 'user')" class="icon-1 icon-white icon-user"></span>
                        </div>
                        <div class="dropdown-menu right">
                            <div class="menu-item">Username: {{ userdata.username }}</div>
                            <div class="menu-item">Group: {{ userdata.usergroup }}</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="desktop" :class="wallpaper.type === 'css' ? wallpaper.value : ''">
                <div class="content" v-context-menu="{ context: null, menuType: 'desktop' }">
                    <div v-for="node in userdata.desktop.children" :key="node.name" class="fs-object" :class="{ selected: selectedFSNode === node }" @click="selectFSNode($event, node)" v-context-menu="{ context: node, menuType: 'fsViewer-file' }">
                        <span class="icon-2" :class="(node.type === 'directory' ? 'icon-folder' : 'icon-file')"></span>
                        <span>{{ node.name }}</span>
                    </div>
                </div>
                <app-window :key="instance.id" v-for="instance in apps" :app-instance="instance" @exit="closeApp(instance)" @focus="activeApp = instance" @minimize="instance.isMinimized = true" :class="{ 'active': activeApp === instance, 'minimized': instance.isMinimized }"></app-window>
            </div>
            <div class="search-bar" :class="{ active: searchOpen }">
                <div class="input">
                    <input type="text" v-model="searchText"/>
                </div>
                <div>
                </div>
            </div>
        </div>`
    });
});