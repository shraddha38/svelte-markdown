
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }
    class HtmlTag {
        constructor(anchor = null) {
            this.a = anchor;
            this.e = this.n = null;
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                this.e = element(target.nodeName);
                this.t = target;
                this.h(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.37.0' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    // string used as a fallback in case local storage doesn't have a saved value
    const initialValue = `# Svelte Markdown Editor

## Put up your code here
`;

    // utility function returning the initial value for markdown
    // using the value in local storage or the default value described above
    function getInitialValue() {
      return fromLocalStorage('markdown--string') || initialValue;
    }

    // utility function returning a value from local storage
    function fromLocalStorage(key) {
      return localStorage.getItem(key);
    }

    // utility function storing the existing string of markup in local storage
    function toLocalStorage(string) {
      // sanitize the string with dompurify
      localStorage.setItem('markdown--string', DOMPurify.sanitize(string));
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
        };
    }

    /* src/Editor.svelte generated by Svelte v3.37.0 */

    const file$2 = "src/Editor.svelte";

    // (126:4) {:else}
    function create_else_block$1(ctx) {
    	let svg;
    	let g;
    	let path0;
    	let path1;
    	let path2;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g = svg_element("g");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			path2 = svg_element("path");
    			attr_dev(path0, "d", "M 10 0 h 52 l 28 25 v 55 a 10 10 0 0 1 -10 10 h -70 a 10 10 0 0 1 -10 -10 v -70 a 10 10 0 0 1 10 -10");
    			add_location(path0, file$2, 139, 10, 4058);
    			attr_dev(path1, "d", "M 20 0 v 25 h 40");
    			add_location(path1, file$2, 142, 10, 4207);
    			attr_dev(path2, "d", "M 20 90 v -40 h 50 v 40");
    			add_location(path2, file$2, 143, 10, 4248);
    			attr_dev(g, "transform", "translate(5 5)");
    			attr_dev(g, "stroke-width", "10");
    			attr_dev(g, "stroke", "currentColor");
    			attr_dev(g, "stroke-linejoin", "round");
    			attr_dev(g, "stroke-linecap", "round");
    			attr_dev(g, "fill", "none");
    			add_location(g, file$2, 131, 8, 3841);
    			attr_dev(svg, "aria-hidden", "true");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 100 100");
    			add_location(svg, file$2, 126, 6, 3715);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g);
    			append_dev(g, path0);
    			append_dev(g, path1);
    			append_dev(g, path2);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(126:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (107:4) {#if isSaved}
    function create_if_block$1(ctx) {
    	let svg;
    	let g;
    	let path0;
    	let path1;
    	let svg_intro;

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			g = svg_element("g");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			attr_dev(path0, "transform", "translate(30 75) rotate(-45)");
    			attr_dev(path0, "d", "M 0 0 v -42.5");
    			add_location(path0, file$2, 121, 10, 3523);
    			attr_dev(path1, "transform", "translate(30 75) rotate(45)");
    			attr_dev(path1, "d", "M 0 0 v -85");
    			add_location(path1, file$2, 122, 10, 3602);
    			attr_dev(g, "transform", "translate(5 5)");
    			attr_dev(g, "stroke-width", "10");
    			attr_dev(g, "stroke", "currentColor");
    			attr_dev(g, "stroke-linejoin", "round");
    			attr_dev(g, "stroke-linecap", "round");
    			attr_dev(g, "fill", "none");
    			add_location(g, file$2, 113, 8, 3306);
    			attr_dev(svg, "aria-hidden", "true");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 100 100");
    			add_location(svg, file$2, 107, 6, 3132);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, g);
    			append_dev(g, path0);
    			append_dev(g, path1);
    		},
    		i: function intro(local) {
    			if (!svg_intro) {
    				add_render_callback(() => {
    					svg_intro = create_in_transition(svg, fly, { duration: 300, delay: 150 });
    					svg_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(107:4) {#if isSaved}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let nav;
    	let button0;
    	let svg0;
    	let g0;
    	let path0;
    	let use0;
    	let t0;
    	let button1;
    	let svg1;
    	let g1;
    	let path1;
    	let use1;
    	let path2;
    	let t1;
    	let button2;
    	let t2;
    	let button3;
    	let svg2;
    	let defs;
    	let mask;
    	let rect;
    	let circle0;
    	let g3;
    	let g2;
    	let path3;
    	let g4;
    	let circle1;
    	let t3;
    	let textarea_1;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*isSaved*/ ctx[2]) return create_if_block$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			button0 = element("button");
    			svg0 = svg_element("svg");
    			g0 = svg_element("g");
    			path0 = svg_element("path");
    			use0 = svg_element("use");
    			t0 = space();
    			button1 = element("button");
    			svg1 = svg_element("svg");
    			g1 = svg_element("g");
    			path1 = svg_element("path");
    			use1 = svg_element("use");
    			path2 = svg_element("path");
    			t1 = space();
    			button2 = element("button");
    			if_block.c();
    			t2 = space();
    			button3 = element("button");
    			svg2 = svg_element("svg");
    			defs = svg_element("defs");
    			mask = svg_element("mask");
    			rect = svg_element("rect");
    			circle0 = svg_element("circle");
    			g3 = svg_element("g");
    			g2 = svg_element("g");
    			path3 = svg_element("path");
    			g4 = svg_element("g");
    			circle1 = svg_element("circle");
    			t3 = space();
    			textarea_1 = element("textarea");
    			attr_dev(path0, "id", "bracket--left");
    			attr_dev(path0, "d", "M 30 18 l -30 27 30 27");
    			add_location(path0, file$2, 75, 8, 2203);
    			attr_dev(use0, "href", "#bracket--left");
    			attr_dev(use0, "transform", "translate(90 0) scale(-1 1)");
    			add_location(use0, file$2, 76, 8, 2267);
    			attr_dev(g0, "transform", "translate(5 5)");
    			attr_dev(g0, "stroke-width", "10");
    			attr_dev(g0, "stroke", "currentColor");
    			attr_dev(g0, "stroke-linejoin", "round");
    			attr_dev(g0, "stroke-linecap", "round");
    			attr_dev(g0, "fill", "none");
    			add_location(g0, file$2, 67, 6, 2002);
    			attr_dev(svg0, "aria-hidden", "true");
    			attr_dev(svg0, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg0, "viewBox", "0 0 100 100");
    			add_location(svg0, file$2, 62, 4, 1886);
    			attr_dev(button0, "title", "Add code block");
    			attr_dev(button0, "aria-label", "Add code block");
    			add_location(button0, file$2, 57, 2, 1780);
    			attr_dev(path1, "id", "curve--left");
    			attr_dev(path1, "d", "M 35 25 h -10 a 20 20 0 0 0 0 40 h 10");
    			add_location(path1, file$2, 94, 8, 2769);
    			attr_dev(use1, "href", "#curve--left");
    			attr_dev(use1, "transform", "translate(90 0) scale(-1 1)");
    			add_location(use1, file$2, 95, 8, 2846);
    			attr_dev(path2, "d", "M 30 45 h 30");
    			add_location(path2, file$2, 96, 8, 2923);
    			attr_dev(g1, "transform", "translate(5 5)");
    			attr_dev(g1, "stroke-width", "10");
    			attr_dev(g1, "stroke", "currentColor");
    			attr_dev(g1, "stroke-linejoin", "round");
    			attr_dev(g1, "stroke-linecap", "round");
    			attr_dev(g1, "fill", "none");
    			add_location(g1, file$2, 86, 6, 2568);
    			attr_dev(svg1, "aria-hidden", "true");
    			attr_dev(svg1, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg1, "viewBox", "0 0 100 100");
    			add_location(svg1, file$2, 81, 4, 2452);
    			attr_dev(button1, "title", "Add link");
    			attr_dev(button1, "aria-label", "Add link");
    			add_location(button1, file$2, 80, 2, 2377);
    			attr_dev(button2, "title", "Save to local storage");
    			attr_dev(button2, "aria-label", "Save to local storage");
    			add_location(button2, file$2, 101, 2, 2991);
    			attr_dev(rect, "x", "0");
    			attr_dev(rect, "y", "0");
    			attr_dev(rect, "width", "100");
    			attr_dev(rect, "height", "100");
    			attr_dev(rect, "fill", "white");
    			add_location(rect, file$2, 162, 10, 4733);
    			attr_dev(circle0, "cx", "50");
    			attr_dev(circle0, "cy", "50");
    			attr_dev(circle0, "r", "24");
    			attr_dev(circle0, "fill", "black");
    			add_location(circle0, file$2, 163, 10, 4803);
    			attr_dev(mask, "id", "mask--circle");
    			attr_dev(mask, "maskUnits", "userSpaceOnUse");
    			add_location(mask, file$2, 161, 8, 4670);
    			add_location(defs, file$2, 160, 6, 4654);
    			attr_dev(path3, "d", "M 0 45 c 25 -40 65 -40 90 0 -25 40 -65 40 -90 0");
    			add_location(path3, file$2, 175, 10, 5153);
    			attr_dev(g2, "transform", "translate(5 5)");
    			attr_dev(g2, "stroke-width", "10");
    			attr_dev(g2, "stroke", "currentColor");
    			attr_dev(g2, "stroke-linejoin", "round");
    			attr_dev(g2, "stroke-linecap", "round");
    			attr_dev(g2, "fill", "currentColor");
    			add_location(g2, file$2, 167, 8, 4928);
    			attr_dev(g3, "mask", "url(#mask--circle)");
    			add_location(g3, file$2, 166, 6, 4889);
    			attr_dev(circle1, "cx", "0");
    			attr_dev(circle1, "cy", "0");
    			attr_dev(circle1, "r", "14");
    			attr_dev(circle1, "fill", "currentColor");
    			add_location(circle1, file$2, 179, 8, 5289);
    			attr_dev(g4, "transform", "translate(50 50)");
    			add_location(g4, file$2, 178, 6, 5247);
    			attr_dev(svg2, "aria-hidden", "true");
    			attr_dev(svg2, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg2, "viewBox", "0 0 100 100");
    			add_location(svg2, file$2, 155, 4, 4538);
    			attr_dev(button3, "title", "Preview markdown");
    			attr_dev(button3, "aria-label", "Download markdown");
    			add_location(button3, file$2, 150, 2, 4424);
    			add_location(nav, file$2, 56, 0, 1771);
    			add_location(textarea_1, file$2, 185, 0, 5389);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, button0);
    			append_dev(button0, svg0);
    			append_dev(svg0, g0);
    			append_dev(g0, path0);
    			append_dev(g0, use0);
    			append_dev(nav, t0);
    			append_dev(nav, button1);
    			append_dev(button1, svg1);
    			append_dev(svg1, g1);
    			append_dev(g1, path1);
    			append_dev(g1, use1);
    			append_dev(g1, path2);
    			append_dev(nav, t1);
    			append_dev(nav, button2);
    			if_block.m(button2, null);
    			append_dev(nav, t2);
    			append_dev(nav, button3);
    			append_dev(button3, svg2);
    			append_dev(svg2, defs);
    			append_dev(defs, mask);
    			append_dev(mask, rect);
    			append_dev(mask, circle0);
    			append_dev(svg2, g3);
    			append_dev(g3, g2);
    			append_dev(g2, path3);
    			append_dev(svg2, g4);
    			append_dev(g4, circle1);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, textarea_1, anchor);
    			/*textarea_1_binding*/ ctx[9](textarea_1);
    			set_input_value(textarea_1, /*value*/ ctx[0]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*handleCode*/ ctx[3], false, false, false),
    					listen_dev(button1, "click", /*handleLink*/ ctx[4], false, false, false),
    					listen_dev(button2, "click", /*handleSave*/ ctx[5], false, false, false),
    					listen_dev(button3, "click", /*handlePreview*/ ctx[7], false, false, false),
    					listen_dev(textarea_1, "input", /*textarea_1_input_handler*/ ctx[10]),
    					listen_dev(textarea_1, "input", /*handleInput*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(button2, null);
    				}
    			}

    			if (dirty & /*value*/ 1) {
    				set_input_value(textarea_1, /*value*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			transition_in(if_block);
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if_block.d();
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(textarea_1);
    			/*textarea_1_binding*/ ctx[9](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Editor", slots, []);
    	const dispatch = createEventDispatcher();
    	let { markdown } = $$props;
    	let value = markdown;

    	// variable bound to the text area, in order to scroll at the bottom when appending elements
    	let textarea;

    	// function adding the input string in the textarea element, and at the point specified by the cursor
    	function updateValue(string) {
    		const { selectionEnd } = textarea;
    		$$invalidate(0, value = `${value.slice(0, selectionEnd)}${string}${value.slice(selectionEnd)}`);
    	}

    	// following a click on the code button, append a series of backtick
    	function handleCode() {
    		const block = `\n\`\`\`\n\n\`\`\`\n`;
    		updateValue(block);
    	}

    	// following a click on the link button, append the syntax for url []()
    	function handleLink() {
    		const link = "[link](url)";
    		updateValue(link);
    	}

    	// following a click on the save button toggle a boolean to change the icon and call the function to save to local storage
    	let isSaved = false;

    	function handleSave() {
    		$$invalidate(2, isSaved = true);
    		toLocalStorage(value);
    	}

    	// following the input event on the textarea remove the saved icon to show the default action
    	function handleInput(e) {
    		if (isSaved) {
    			$$invalidate(2, isSaved = false);
    		}
    	}

    	// following a click on the preview button, dispatch the event to show the preview
    	function handlePreview() {
    		// pass the value to the component to update the markdown
    		dispatch("preview", value);
    	}

    	const writable_props = ["markdown"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Editor> was created with unknown prop '${key}'`);
    	});

    	function textarea_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			textarea = $$value;
    			$$invalidate(1, textarea);
    		});
    	}

    	function textarea_1_input_handler() {
    		value = this.value;
    		$$invalidate(0, value);
    	}

    	$$self.$$set = $$props => {
    		if ("markdown" in $$props) $$invalidate(8, markdown = $$props.markdown);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		onDestroy,
    		dispatch,
    		toLocalStorage,
    		fly,
    		markdown,
    		value,
    		textarea,
    		updateValue,
    		handleCode,
    		handleLink,
    		isSaved,
    		handleSave,
    		handleInput,
    		handlePreview
    	});

    	$$self.$inject_state = $$props => {
    		if ("markdown" in $$props) $$invalidate(8, markdown = $$props.markdown);
    		if ("value" in $$props) $$invalidate(0, value = $$props.value);
    		if ("textarea" in $$props) $$invalidate(1, textarea = $$props.textarea);
    		if ("isSaved" in $$props) $$invalidate(2, isSaved = $$props.isSaved);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		value,
    		textarea,
    		isSaved,
    		handleCode,
    		handleLink,
    		handleSave,
    		handleInput,
    		handlePreview,
    		markdown,
    		textarea_1_binding,
    		textarea_1_input_handler
    	];
    }

    class Editor extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { markdown: 8 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Editor",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*markdown*/ ctx[8] === undefined && !("markdown" in props)) {
    			console.warn("<Editor> was created without expected prop 'markdown'");
    		}
    	}

    	get markdown() {
    		throw new Error("<Editor>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set markdown(value) {
    		throw new Error("<Editor>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Preview.svelte generated by Svelte v3.37.0 */
    const file$1 = "src/Preview.svelte";

    function create_fragment$1(ctx) {
    	let nav;
    	let button;
    	let svg;
    	let g;
    	let path0;
    	let path1;
    	let t;
    	let html_tag;
    	let html_anchor;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			button = element("button");
    			svg = svg_element("svg");
    			g = svg_element("g");
    			path0 = svg_element("path");
    			path1 = svg_element("path");
    			t = space();
    			html_anchor = empty();
    			attr_dev(path0, "d", "M 73 0 l 17 17 -45 45 -17 0 0 -17 45 -45");
    			add_location(path0, file$1, 28, 8, 702);
    			attr_dev(path1, "d", "M 35 10 h -25 a 10 10 0 0 0 -10 10 v 60 a 10 10 0 0 0 10 10 h 60 a 10 10 0 0 0 10 -10 v -25");
    			add_location(path1, file$1, 29, 8, 765);
    			attr_dev(g, "transform", "translate(5 5)");
    			attr_dev(g, "stroke-width", "10");
    			attr_dev(g, "stroke", "currentColor");
    			attr_dev(g, "stroke-linejoin", "round");
    			attr_dev(g, "stroke-linecap", "round");
    			attr_dev(g, "fill", "none");
    			add_location(g, file$1, 20, 6, 501);
    			attr_dev(svg, "aria-hidden", "true");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "viewBox", "0 0 100 100");
    			add_location(svg, file$1, 15, 4, 385);
    			attr_dev(button, "title", "Edit markdown");
    			attr_dev(button, "aria-label", "Edit markdown");
    			add_location(button, file$1, 10, 2, 269);
    			add_location(nav, file$1, 8, 0, 193);
    			html_tag = new HtmlTag(html_anchor);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, button);
    			append_dev(button, svg);
    			append_dev(svg, g);
    			append_dev(g, path0);
    			append_dev(g, path1);
    			insert_dev(target, t, anchor);
    			html_tag.m(/*markup*/ ctx[0], target, anchor);
    			insert_dev(target, html_anchor, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[2], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*markup*/ 1) html_tag.p(/*markup*/ ctx[0]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Preview", slots, []);
    	const dispatch = createEventDispatcher();
    	let { markup } = $$props;
    	const writable_props = ["markup"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Preview> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => dispatch("edit");

    	$$self.$$set = $$props => {
    		if ("markup" in $$props) $$invalidate(0, markup = $$props.markup);
    	};

    	$$self.$capture_state = () => ({ createEventDispatcher, dispatch, markup });

    	$$self.$inject_state = $$props => {
    		if ("markup" in $$props) $$invalidate(0, markup = $$props.markup);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [markup, dispatch, click_handler];
    }

    class Preview extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { markup: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Preview",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*markup*/ ctx[0] === undefined && !("markup" in props)) {
    			console.warn("<Preview> was created without expected prop 'markup'");
    		}
    	}

    	get markup() {
    		throw new Error("<Preview>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set markup(value) {
    		throw new Error("<Preview>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/App.svelte generated by Svelte v3.37.0 */
    const file = "src/App.svelte";

    // (27:2) {:else}
    function create_else_block(ctx) {
    	let editor;
    	let current;

    	editor = new Editor({
    			props: { markdown: /*markdown*/ ctx[0] },
    			$$inline: true
    		});

    	editor.$on("preview", /*handlePreview*/ ctx[3]);

    	const block = {
    		c: function create() {
    			create_component(editor.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(editor, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const editor_changes = {};
    			if (dirty & /*markdown*/ 1) editor_changes.markdown = /*markdown*/ ctx[0];
    			editor.$set(editor_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(editor.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(editor.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(editor, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(27:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (25:2) {#if showPreview}
    function create_if_block(ctx) {
    	let preview;
    	let current;

    	preview = new Preview({
    			props: { markup: marked(/*markdown*/ ctx[0]) },
    			$$inline: true
    		});

    	preview.$on("edit", /*handleEdit*/ ctx[2]);

    	const block = {
    		c: function create() {
    			create_component(preview.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(preview, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const preview_changes = {};
    			if (dirty & /*markdown*/ 1) preview_changes.markup = marked(/*markdown*/ ctx[0]);
    			preview.$set(preview_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(preview.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(preview.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(preview, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(25:2) {#if showPreview}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*showPreview*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			attr_dev(div, "class", "markdown-editor");
    			add_location(div, file, 23, 0, 776);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let markdown = getInitialValue();

    	// boolean toggling between the two components
    	let showPreview = false;

    	// when receiving the edit event update the boolean to show the editor component
    	function handleEdit() {
    		$$invalidate(1, showPreview = false);
    	}

    	// when receiving the preview event update the markdown and the boolean to show the preview component
    	function handlePreview(e) {
    		// sanitize the string with DOMpurify
    		$$invalidate(0, markdown = DOMPurify.sanitize(e.detail));

    		$$invalidate(1, showPreview = true);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Editor,
    		Preview,
    		getInitialValue,
    		markdown,
    		showPreview,
    		handleEdit,
    		handlePreview
    	});

    	$$self.$inject_state = $$props => {
    		if ("markdown" in $$props) $$invalidate(0, markdown = $$props.markdown);
    		if ("showPreview" in $$props) $$invalidate(1, showPreview = $$props.showPreview);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [markdown, showPreview, handleEdit, handlePreview];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
