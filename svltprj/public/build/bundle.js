
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
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

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
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
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
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
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
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
        const prop_values = options.props || {};
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
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
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
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
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
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.22.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function MD5(d) {
        d = unescape(encodeURIComponent(d));
        var g = X(d);
        g = Y(g, 8 * d.length);
        g = V(g);
        g = M(g);
    	return g.toLowerCase();
    } 
    function M(d) {
        for (var _, m = "0123456789ABCDEF", f = "", r = 0; r < d.length; r++) _ = d.charCodeAt(r), f += m.charAt(_ >>> 4 & 15) + m.charAt(15 & _);
    	return String(f)
    }
     
    function X(d) {
    	for (var _ = Array(d.length >> 2), m = 0; m < _.length; m++) _[m] = 0;
    	for (m = 0; m < 8 * d.length; m += 8) _[m >> 5] |= (255 & d.charCodeAt(m / 8)) << m % 32;
    	return _
    }
     
    function V(d) {
    	for (var _ = "", m = 0; m < 32 * d.length; m += 8) _ += String.fromCharCode(d[m >> 5] >>> m % 32 & 255);
    	return _
    }
     
    function Y(d, _) {
    	d[_ >> 5] |= 128 << _ % 32, d[14 + (_ + 64 >>> 9 << 4)] = _;
    	for (var m = 1732584193, f = -271733879, r = -1732584194, i = 271733878, n = 0; n < d.length; n += 16) {
    		var h = m,
    			t = f,
    			g = r,
    			e = i;
    		f = md5_ii(f = md5_ii(f = md5_ii(f = md5_ii(f = md5_hh(f = md5_hh(f = md5_hh(f = md5_hh(f = md5_gg(f = md5_gg(f = md5_gg(f = md5_gg(f = md5_ff(f = md5_ff(f = md5_ff(f = md5_ff(f, r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 0], 7, -680876936), f, r, d[n + 1], 12, -389564586), m, f, d[n + 2], 17, 606105819), i, m, d[n + 3], 22, -1044525330), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 4], 7, -176418897), f, r, d[n + 5], 12, 1200080426), m, f, d[n + 6], 17, -1473231341), i, m, d[n + 7], 22, -45705983), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 8], 7, 1770035416), f, r, d[n + 9], 12, -1958414417), m, f, d[n + 10], 17, -42063), i, m, d[n + 11], 22, -1990404162), r = md5_ff(r, i = md5_ff(i, m = md5_ff(m, f, r, i, d[n + 12], 7, 1804603682), f, r, d[n + 13], 12, -40341101), m, f, d[n + 14], 17, -1502002290), i, m, d[n + 15], 22, 1236535329), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 1], 5, -165796510), f, r, d[n + 6], 9, -1069501632), m, f, d[n + 11], 14, 643717713), i, m, d[n + 0], 20, -373897302), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 5], 5, -701558691), f, r, d[n + 10], 9, 38016083), m, f, d[n + 15], 14, -660478335), i, m, d[n + 4], 20, -405537848), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 9], 5, 568446438), f, r, d[n + 14], 9, -1019803690), m, f, d[n + 3], 14, -187363961), i, m, d[n + 8], 20, 1163531501), r = md5_gg(r, i = md5_gg(i, m = md5_gg(m, f, r, i, d[n + 13], 5, -1444681467), f, r, d[n + 2], 9, -51403784), m, f, d[n + 7], 14, 1735328473), i, m, d[n + 12], 20, -1926607734), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 5], 4, -378558), f, r, d[n + 8], 11, -2022574463), m, f, d[n + 11], 16, 1839030562), i, m, d[n + 14], 23, -35309556), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 1], 4, -1530992060), f, r, d[n + 4], 11, 1272893353), m, f, d[n + 7], 16, -155497632), i, m, d[n + 10], 23, -1094730640), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 13], 4, 681279174), f, r, d[n + 0], 11, -358537222), m, f, d[n + 3], 16, -722521979), i, m, d[n + 6], 23, 76029189), r = md5_hh(r, i = md5_hh(i, m = md5_hh(m, f, r, i, d[n + 9], 4, -640364487), f, r, d[n + 12], 11, -421815835), m, f, d[n + 15], 16, 530742520), i, m, d[n + 2], 23, -995338651), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 0], 6, -198630844), f, r, d[n + 7], 10, 1126891415), m, f, d[n + 14], 15, -1416354905), i, m, d[n + 5], 21, -57434055), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 12], 6, 1700485571), f, r, d[n + 3], 10, -1894986606), m, f, d[n + 10], 15, -1051523), i, m, d[n + 1], 21, -2054922799), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 8], 6, 1873313359), f, r, d[n + 15], 10, -30611744), m, f, d[n + 6], 15, -1560198380), i, m, d[n + 13], 21, 1309151649), r = md5_ii(r, i = md5_ii(i, m = md5_ii(m, f, r, i, d[n + 4], 6, -145523070), f, r, d[n + 11], 10, -1120210379), m, f, d[n + 2], 15, 718787259), i, m, d[n + 9], 21, -343485551), m = safe_add(m, h), f = safe_add(f, t), r = safe_add(r, g), i = safe_add(i, e);
    	}
    	return Array(m, f, r, i)
    }
     
    function md5_cmn(d, _, m, f, r, i) {
    	return safe_add(bit_rol(safe_add(safe_add(_, d), safe_add(f, i)), r), m)
    }
     
    function md5_ff(d, _, m, f, r, i, n) {
    	return md5_cmn(_ & m | ~_ & f, d, _, r, i, n)
    }
     
    function md5_gg(d, _, m, f, r, i, n) {
    	return md5_cmn(_ & f | m & ~f, d, _, r, i, n)
    }
     
    function md5_hh(d, _, m, f, r, i, n) {
    	return md5_cmn(_ ^ m ^ f, d, _, r, i, n)
    }
     
    function md5_ii(d, _, m, f, r, i, n) {
    	return md5_cmn(m ^ (_ | ~f), d, _, r, i, n)
    }
     
    function safe_add(d, _) {
    	var m = (65535 & d) + (65535 & _);
    	return (d >> 16) + (_ >> 16) + (m >> 16) << 16 | 65535 & m
    }
     
    function bit_rol(d, _) {
    	return d << _ | d >>> 32 - _
    }

    /* src\App.svelte generated by Svelte v3.22.2 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[53] = list[i];
    	child_ctx[54] = list;
    	child_ctx[55] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[53] = list[i];
    	child_ctx[56] = list;
    	child_ctx[55] = i;
    	return child_ctx;
    }

    // (585:2) {#if login == 0}
    function create_if_block_12(ctx) {
    	let div1;
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let button0;
    	let t3;
    	let button1;
    	let t5;
    	let div0;
    	let t6;
    	let dispose;
    	let if_block = /*login_err*/ ctx[11] != "" && create_if_block_13(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "Войти";
    			t3 = space();
    			button1 = element("button");
    			button1.textContent = "Регистрация";
    			t5 = space();
    			div0 = element("div");
    			t6 = space();
    			if (if_block) if_block.c();
    			attr_dev(input0, "class", "log svelte-b6l8o6");
    			attr_dev(input0, "placeholder", "логин");
    			add_location(input0, file, 586, 6, 16916);
    			attr_dev(input1, "class", "log svelte-b6l8o6");
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "placeholder", "пароль");
    			add_location(input1, file, 587, 6, 16981);
    			attr_dev(button0, "class", "log svelte-b6l8o6");
    			add_location(button0, file, 588, 6, 17066);
    			attr_dev(button1, "class", "log svelte-b6l8o6");
    			add_location(button1, file, 591, 6, 17164);
    			attr_dev(div0, "class", "flex svelte-b6l8o6");
    			add_location(div0, file, 592, 6, 17246);
    			attr_dev(div1, "class", "logdiv svelte-b6l8o6");
    			add_location(div1, file, 585, 4, 16888);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, input0);
    			set_input_value(input0, /*mail*/ ctx[9]);
    			append_dev(div1, t0);
    			append_dev(div1, input1);
    			set_input_value(input1, /*password*/ ctx[10]);
    			append_dev(div1, t1);
    			append_dev(div1, button0);
    			append_dev(div1, t3);
    			append_dev(div1, button1);
    			append_dev(div1, t5);
    			append_dev(div1, div0);
    			append_dev(div1, t6);
    			if (if_block) if_block.m(div1, null);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler*/ ctx[31]),
    				listen_dev(input1, "input", /*input1_input_handler*/ ctx[32]),
    				listen_dev(button0, "click", /*click_handler*/ ctx[33], false, false, false),
    				listen_dev(button1, "click", /*click_handler_1*/ ctx[34], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*mail*/ 512 && input0.value !== /*mail*/ ctx[9]) {
    				set_input_value(input0, /*mail*/ ctx[9]);
    			}

    			if (dirty[0] & /*password*/ 1024 && input1.value !== /*password*/ ctx[10]) {
    				set_input_value(input1, /*password*/ ctx[10]);
    			}

    			if (/*login_err*/ ctx[11] != "") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_13(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(585:2) {#if login == 0}",
    		ctx
    	});

    	return block;
    }

    // (594:6) {#if login_err != ''}
    function create_if_block_13(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*login_err*/ ctx[11]);
    			attr_dev(p, "class", "login-err svelte-b6l8o6");
    			add_location(p, file, 594, 6, 17309);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*login_err*/ 2048) set_data_dev(t, /*login_err*/ ctx[11]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(594:6) {#if login_err != ''}",
    		ctx
    	});

    	return block;
    }

    // (599:2) {#if login === 1}
    function create_if_block_11(ctx) {
    	let button;
    	let t1;
    	let p;
    	let t2;
    	let t3;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Выйти";
    			t1 = space();
    			p = element("p");
    			t2 = text("Пользователь: ");
    			t3 = text(/*mail*/ ctx[9]);
    			attr_dev(button, "id", "logout");
    			attr_dev(button, "class", "svelte-b6l8o6");
    			add_location(button, file, 599, 4, 17405);
    			attr_dev(p, "id", "user-info");
    			attr_dev(p, "class", "svelte-b6l8o6");
    			add_location(p, file, 600, 4, 17472);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t2);
    			append_dev(p, t3);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[35], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*mail*/ 512) set_data_dev(t3, /*mail*/ ctx[9]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(599:2) {#if login === 1}",
    		ctx
    	});

    	return block;
    }

    // (603:2) {#if login == 2}
    function create_if_block_9(ctx) {
    	let div1;
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let button;
    	let t3;
    	let div0;
    	let t4;
    	let dispose;
    	let if_block = /*reg_err*/ ctx[12] != "" && create_if_block_10(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			button = element("button");
    			button.textContent = "Зарегистрироваться";
    			t3 = space();
    			div0 = element("div");
    			t4 = space();
    			if (if_block) if_block.c();
    			attr_dev(input0, "class", "log svelte-b6l8o6");
    			attr_dev(input0, "placeholder", "логин");
    			add_location(input0, file, 604, 6, 17577);
    			attr_dev(input1, "class", "log svelte-b6l8o6");
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "placeholder", "пароль");
    			add_location(input1, file, 605, 6, 17642);
    			attr_dev(button, "class", "log svelte-b6l8o6");
    			add_location(button, file, 606, 6, 17727);
    			attr_dev(div0, "class", "flex svelte-b6l8o6");
    			add_location(div0, file, 609, 6, 17836);
    			attr_dev(div1, "class", "logdiv svelte-b6l8o6");
    			add_location(div1, file, 603, 4, 17549);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, input0);
    			set_input_value(input0, /*mail*/ ctx[9]);
    			append_dev(div1, t0);
    			append_dev(div1, input1);
    			set_input_value(input1, /*password*/ ctx[10]);
    			append_dev(div1, t1);
    			append_dev(div1, button);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div1, t4);
    			if (if_block) if_block.m(div1, null);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler_1*/ ctx[36]),
    				listen_dev(input1, "input", /*input1_input_handler_1*/ ctx[37]),
    				listen_dev(button, "click", /*click_handler_3*/ ctx[38], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*mail*/ 512 && input0.value !== /*mail*/ ctx[9]) {
    				set_input_value(input0, /*mail*/ ctx[9]);
    			}

    			if (dirty[0] & /*password*/ 1024 && input1.value !== /*password*/ ctx[10]) {
    				set_input_value(input1, /*password*/ ctx[10]);
    			}

    			if (/*reg_err*/ ctx[12] != "") {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_10(ctx);
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(603:2) {#if login == 2}",
    		ctx
    	});

    	return block;
    }

    // (611:6) {#if reg_err != ''}
    function create_if_block_10(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*reg_err*/ ctx[12]);
    			attr_dev(p, "class", "login-err svelte-b6l8o6");
    			add_location(p, file, 611, 8, 17903);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*reg_err*/ 4096) set_data_dev(t, /*reg_err*/ ctx[12]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(611:6) {#if reg_err != ''}",
    		ctx
    	});

    	return block;
    }

    // (616:2) {#if login == 3}
    function create_if_block_8(ctx) {
    	let div1;
    	let input;
    	let t0;
    	let button;
    	let t2;
    	let div0;
    	let t3;
    	let p;
    	let t4;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			input = element("input");
    			t0 = space();
    			button = element("button");
    			button.textContent = "Сохранить";
    			t2 = space();
    			div0 = element("div");
    			t3 = space();
    			p = element("p");
    			t4 = text(/*save_err*/ ctx[13]);
    			attr_dev(input, "class", "savehandle svelte-b6l8o6");
    			attr_dev(input, "placeholder", "Ваш хэндл?");
    			add_location(input, file, 617, 4, 18022);
    			attr_dev(button, "class", "savehandle svelte-b6l8o6");
    			add_location(button, file, 618, 4, 18096);
    			attr_dev(div0, "class", "flex svelte-b6l8o6");
    			add_location(div0, file, 619, 4, 18180);
    			attr_dev(p, "class", "login-err svelte-b6l8o6");
    			add_location(p, file, 620, 4, 18212);
    			attr_dev(div1, "class", "logdiv svelte-b6l8o6");
    			add_location(div1, file, 616, 4, 17997);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, input);
    			set_input_value(input, /*name*/ ctx[0]);
    			append_dev(div1, t0);
    			append_dev(div1, button);
    			append_dev(div1, t2);
    			append_dev(div1, div0);
    			append_dev(div1, t3);
    			append_dev(div1, p);
    			append_dev(p, t4);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input, "input", /*input_input_handler*/ ctx[39]),
    				listen_dev(button, "click", /*click_handler_4*/ ctx[40], false, false, false)
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*name*/ 1 && input.value !== /*name*/ ctx[0]) {
    				set_input_value(input, /*name*/ ctx[0]);
    			}

    			if (dirty[0] & /*save_err*/ 8192) set_data_dev(t4, /*save_err*/ ctx[13]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(616:2) {#if login == 3}",
    		ctx
    	});

    	return block;
    }

    // (630:2) {#if login == 1}
    function create_if_block_7(ctx) {
    	let button;
    	let t;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(/*reload_err*/ ctx[7]);
    			attr_dev(button, "id", "reload");
    			attr_dev(button, "class", "svelte-b6l8o6");
    			add_location(button, file, 629, 20, 18367);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*click_handler_5*/ ctx[41], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*reload_err*/ 128) set_data_dev(t, /*reload_err*/ ctx[7]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(630:2) {#if login == 1}",
    		ctx
    	});

    	return block;
    }

    // (635:2) {#if res.length > 0}
    function create_if_block_5(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*res*/ ctx[15];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*saveCfProblem, res, openComment, handleClick, problemCfDelete*/ 1294336) {
    				each_value_1 = /*res*/ ctx[15];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(635:2) {#if res.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (649:10) {#if openComment.has(ar[4]) === true}
    function create_if_block_6(ctx) {
    	let textarea;
    	let t0;
    	let button;
    	let dispose;

    	function textarea_input_handler() {
    		/*textarea_input_handler*/ ctx[44].call(textarea, /*ar*/ ctx[53]);
    	}

    	function click_handler_8(...args) {
    		return /*click_handler_8*/ ctx[45](/*i*/ ctx[55], ...args);
    	}

    	const block = {
    		c: function create() {
    			textarea = element("textarea");
    			t0 = space();
    			button = element("button");
    			button.textContent = "Сохранить";
    			attr_dev(textarea, "wrap", "soft");
    			attr_dev(textarea, "class", "comment-box svelte-b6l8o6");
    			attr_dev(textarea, "placeholder", "комментарий");
    			add_location(textarea, file, 649, 12, 19198);
    			attr_dev(button, "class", "save-comment svelte-b6l8o6");
    			add_location(button, file, 651, 12, 19326);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, textarea, anchor);
    			set_input_value(textarea, /*ar*/ ctx[53][5]);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, button, anchor);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(textarea, "input", textarea_input_handler),
    				listen_dev(button, "click", click_handler_8, false, false, false)
    			];
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*res*/ 32768) {
    				set_input_value(textarea, /*ar*/ ctx[53][5]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(textarea);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(button);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(649:10) {#if openComment.has(ar[4]) === true}",
    		ctx
    	});

    	return block;
    }

    // (636:4) {#each res as ar, i}
    function create_each_block_1(ctx) {
    	let hr;
    	let t0;
    	let div4;
    	let a;
    	let t1_value = /*ar*/ ctx[53][1] + "";
    	let t1;
    	let a_href_value;
    	let t2;
    	let img;
    	let img_src_value;
    	let t3;
    	let div0;
    	let t4;
    	let p0;
    	let t5;
    	let t6_value = /*ar*/ ctx[53][2] + 1 + "";
    	let t6;
    	let t7;
    	let p1;
    	let t8_value = /*ar*/ ctx[53][3] + "";
    	let t8;
    	let t9;
    	let div1;
    	let t10;
    	let button;
    	let t12;
    	let div2;
    	let t13;
    	let show_if = /*openComment*/ ctx[14].has(/*ar*/ ctx[53][4]) === true;
    	let t14;
    	let div3;
    	let t15;
    	let dispose;

    	function click_handler_6(...args) {
    		return /*click_handler_6*/ ctx[42](/*i*/ ctx[55], ...args);
    	}

    	function click_handler_7(...args) {
    		return /*click_handler_7*/ ctx[43](/*ar*/ ctx[53], ...args);
    	}

    	let if_block = show_if && create_if_block_6(ctx);

    	const block = {
    		c: function create() {
    			hr = element("hr");
    			t0 = space();
    			div4 = element("div");
    			a = element("a");
    			t1 = text(t1_value);
    			t2 = space();
    			img = element("img");
    			t3 = space();
    			div0 = element("div");
    			t4 = space();
    			p0 = element("p");
    			t5 = text("Номер теста ");
    			t6 = text(t6_value);
    			t7 = space();
    			p1 = element("p");
    			t8 = text(t8_value);
    			t9 = space();
    			div1 = element("div");
    			t10 = space();
    			button = element("button");
    			button.textContent = "комментарий";
    			t12 = space();
    			div2 = element("div");
    			t13 = space();
    			if (if_block) if_block.c();
    			t14 = space();
    			div3 = element("div");
    			t15 = space();
    			add_location(hr, file, 636, 10, 18550);
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "class", "task-name svelte-b6l8o6");
    			attr_dev(a, "href", a_href_value = "https://codeforces.com/contest/" + /*ar*/ ctx[53][0]);
    			add_location(a, file, 638, 10, 18595);
    			if (img.src !== (img_src_value = "secdel.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "удалить");
    			attr_dev(img, "class", "delete svelte-b6l8o6");
    			add_location(img, file, 639, 10, 18706);
    			attr_dev(div0, "class", "flex svelte-b6l8o6");
    			add_location(div0, file, 640, 10, 18810);
    			attr_dev(p0, "class", "test svelte-b6l8o6");
    			add_location(p0, file, 641, 10, 18848);
    			attr_dev(p1, "class", "verdict svelte-b6l8o6");
    			add_location(p1, file, 642, 10, 18906);
    			attr_dev(div1, "class", "flex svelte-b6l8o6");
    			add_location(div1, file, 643, 10, 18951);
    			attr_dev(button, "class", "comment svelte-b6l8o6");
    			add_location(button, file, 644, 10, 18989);
    			attr_dev(div2, "class", "flex svelte-b6l8o6");
    			add_location(div2, file, 647, 10, 19110);
    			attr_dev(div3, "class", "flex svelte-b6l8o6");
    			add_location(div3, file, 653, 10, 19438);
    			attr_dev(div4, "class", "task svelte-b6l8o6");
    			add_location(div4, file, 637, 8, 18564);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, a);
    			append_dev(a, t1);
    			append_dev(div4, t2);
    			append_dev(div4, img);
    			append_dev(div4, t3);
    			append_dev(div4, div0);
    			append_dev(div4, t4);
    			append_dev(div4, p0);
    			append_dev(p0, t5);
    			append_dev(p0, t6);
    			append_dev(div4, t7);
    			append_dev(div4, p1);
    			append_dev(p1, t8);
    			append_dev(div4, t9);
    			append_dev(div4, div1);
    			append_dev(div4, t10);
    			append_dev(div4, button);
    			append_dev(div4, t12);
    			append_dev(div4, div2);
    			append_dev(div4, t13);
    			if (if_block) if_block.m(div4, null);
    			append_dev(div4, t14);
    			append_dev(div4, div3);
    			append_dev(div4, t15);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(img, "click", click_handler_6, false, false, false),
    				listen_dev(button, "click", click_handler_7, false, false, false)
    			];
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*res*/ 32768 && t1_value !== (t1_value = /*ar*/ ctx[53][1] + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*res*/ 32768 && a_href_value !== (a_href_value = "https://codeforces.com/contest/" + /*ar*/ ctx[53][0])) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty[0] & /*res*/ 32768 && t6_value !== (t6_value = /*ar*/ ctx[53][2] + 1 + "")) set_data_dev(t6, t6_value);
    			if (dirty[0] & /*res*/ 32768 && t8_value !== (t8_value = /*ar*/ ctx[53][3] + "")) set_data_dev(t8, t8_value);
    			if (dirty[0] & /*openComment, res*/ 49152) show_if = /*openComment*/ ctx[14].has(/*ar*/ ctx[53][4]) === true;

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_6(ctx);
    					if_block.c();
    					if_block.m(div4, t14);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div4);
    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(636:4) {#each res as ar, i}",
    		ctx
    	});

    	return block;
    }

    // (662:2) {#if login == 1}
    function create_if_block_4(ctx) {
    	let button;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Добавить задачу";
    			attr_dev(button, "id", "addtask");
    			attr_dev(button, "class", "svelte-b6l8o6");
    			add_location(button, file, 662, 2, 19595);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*click_handler_9*/ ctx[46], false, false, false);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(662:2) {#if login == 1}",
    		ctx
    	});

    	return block;
    }

    // (667:2) {#if add}
    function create_if_block_3(ctx) {
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let br;
    	let dispose;

    	const block = {
    		c: function create() {
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			br = element("br");
    			attr_dev(input0, "id", "taskurl");
    			attr_dev(input0, "type", "url");
    			attr_dev(input0, "placeholder", "Ссылка на задачу");
    			attr_dev(input0, "class", "svelte-b6l8o6");
    			add_location(input0, file, 667, 4, 19705);
    			attr_dev(input1, "id", "taskname");
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", "Название задачи");
    			attr_dev(input1, "class", "svelte-b6l8o6");
    			add_location(input1, file, 668, 4, 19795);
    			add_location(br, file, 669, 4, 19887);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, input0, anchor);
    			set_input_value(input0, /*taskurl*/ ctx[2]);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, input1, anchor);
    			set_input_value(input1, /*taskname*/ ctx[3]);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, br, anchor);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(input0, "input", /*input0_input_handler_2*/ ctx[47]),
    				listen_dev(input1, "input", /*input1_input_handler_2*/ ctx[48])
    			];
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*taskurl*/ 4) {
    				set_input_value(input0, /*taskurl*/ ctx[2]);
    			}

    			if (dirty[0] & /*taskname*/ 8 && input1.value !== /*taskname*/ ctx[3]) {
    				set_input_value(input1, /*taskname*/ ctx[3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(input1);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(br);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(667:2) {#if add}",
    		ctx
    	});

    	return block;
    }

    // (672:2) {#if call}
    function create_if_block_2(ctx) {
    	let p;
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(/*result*/ ctx[5]);
    			attr_dev(p, "color", "red");
    			add_location(p, file, 672, 8, 19921);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*result*/ 32) set_data_dev(t, /*result*/ ctx[5]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(672:2) {#if call}",
    		ctx
    	});

    	return block;
    }

    // (676:2) {#if clienttask.length > 0}
    function create_if_block(ctx) {
    	let each_1_anchor;
    	let each_value = /*clienttask*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*saveUserProblem, clienttask, openComment, handleClick, userProblemDelete*/ 868368) {
    				each_value = /*clienttask*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(676:2) {#if clienttask.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (687:10) {#if openComment.has(ar[2]) === true}
    function create_if_block_1(ctx) {
    	let textarea;
    	let t0;
    	let button;
    	let dispose;

    	function textarea_input_handler_1() {
    		/*textarea_input_handler_1*/ ctx[51].call(textarea, /*ar*/ ctx[53]);
    	}

    	function click_handler_12(...args) {
    		return /*click_handler_12*/ ctx[52](/*i*/ ctx[55], ...args);
    	}

    	const block = {
    		c: function create() {
    			textarea = element("textarea");
    			t0 = space();
    			button = element("button");
    			button.textContent = "Сохранить";
    			attr_dev(textarea, "wrap", "soft");
    			attr_dev(textarea, "class", "comment-box svelte-b6l8o6");
    			attr_dev(textarea, "placeholder", "комментарий");
    			add_location(textarea, file, 688, 12, 20573);
    			attr_dev(button, "class", "save-comment svelte-b6l8o6");
    			add_location(button, file, 689, 12, 20688);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, textarea, anchor);
    			set_input_value(textarea, /*ar*/ ctx[53][3]);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, button, anchor);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(textarea, "input", textarea_input_handler_1),
    				listen_dev(button, "click", click_handler_12, false, false, false)
    			];
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty[0] & /*clienttask*/ 16) {
    				set_input_value(textarea, /*ar*/ ctx[53][3]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(textarea);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(button);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(687:10) {#if openComment.has(ar[2]) === true}",
    		ctx
    	});

    	return block;
    }

    // (677:6) {#each clienttask as ar, i}
    function create_each_block(ctx) {
    	let hr;
    	let t0;
    	let div3;
    	let a;
    	let t1_value = /*ar*/ ctx[53][1] + "";
    	let t1;
    	let a_href_value;
    	let t2;
    	let img;
    	let img_src_value;
    	let t3;
    	let div0;
    	let t4;
    	let button;
    	let t6;
    	let div1;
    	let t7;
    	let show_if = /*openComment*/ ctx[14].has(/*ar*/ ctx[53][2]) === true;
    	let t8;
    	let div2;
    	let t9;
    	let dispose;

    	function click_handler_10(...args) {
    		return /*click_handler_10*/ ctx[49](/*i*/ ctx[55], ...args);
    	}

    	function click_handler_11(...args) {
    		return /*click_handler_11*/ ctx[50](/*ar*/ ctx[53], ...args);
    	}

    	let if_block = show_if && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			hr = element("hr");
    			t0 = space();
    			div3 = element("div");
    			a = element("a");
    			t1 = text(t1_value);
    			t2 = space();
    			img = element("img");
    			t3 = space();
    			div0 = element("div");
    			t4 = space();
    			button = element("button");
    			button.textContent = "комментарий";
    			t6 = space();
    			div1 = element("div");
    			t7 = space();
    			if (if_block) if_block.c();
    			t8 = space();
    			div2 = element("div");
    			t9 = space();
    			add_location(hr, file, 677, 10, 20062);
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "class", "task-name svelte-b6l8o6");
    			attr_dev(a, "href", a_href_value = /*ar*/ ctx[53][0]);
    			add_location(a, file, 679, 10, 20107);
    			if (img.src !== (img_src_value = "secdel.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "удалить");
    			attr_dev(img, "border-radius", "50%");
    			attr_dev(img, "class", "delete svelte-b6l8o6");
    			add_location(img, file, 680, 10, 20187);
    			attr_dev(div0, "class", "flex svelte-b6l8o6");
    			add_location(div0, file, 681, 10, 20315);
    			attr_dev(button, "class", "comment svelte-b6l8o6");
    			add_location(button, file, 682, 10, 20353);
    			attr_dev(div1, "class", "flex svelte-b6l8o6");
    			add_location(div1, file, 685, 10, 20474);
    			attr_dev(div2, "class", "flex svelte-b6l8o6");
    			add_location(div2, file, 691, 10, 20802);
    			attr_dev(div3, "class", "task svelte-b6l8o6");
    			add_location(div3, file, 678, 8, 20076);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div3, anchor);
    			append_dev(div3, a);
    			append_dev(a, t1);
    			append_dev(div3, t2);
    			append_dev(div3, img);
    			append_dev(div3, t3);
    			append_dev(div3, div0);
    			append_dev(div3, t4);
    			append_dev(div3, button);
    			append_dev(div3, t6);
    			append_dev(div3, div1);
    			append_dev(div3, t7);
    			if (if_block) if_block.m(div3, null);
    			append_dev(div3, t8);
    			append_dev(div3, div2);
    			append_dev(div3, t9);
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(img, "click", click_handler_10, false, false, false),
    				listen_dev(button, "click", click_handler_11, false, false, false)
    			];
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*clienttask*/ 16 && t1_value !== (t1_value = /*ar*/ ctx[53][1] + "")) set_data_dev(t1, t1_value);

    			if (dirty[0] & /*clienttask*/ 16 && a_href_value !== (a_href_value = /*ar*/ ctx[53][0])) {
    				attr_dev(a, "href", a_href_value);
    			}

    			if (dirty[0] & /*openComment, clienttask*/ 16400) show_if = /*openComment*/ ctx[14].has(/*ar*/ ctx[53][2]) === true;

    			if (show_if) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					if_block.m(div3, t8);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div3);
    			if (if_block) if_block.d();
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(677:6) {#each clienttask as ar, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div0;
    	let t0;
    	let t1;
    	let t2;
    	let t3;
    	let br0;
    	let t4;
    	let div2;
    	let p0;
    	let t6;
    	let t7;
    	let div1;
    	let t8;
    	let t9;
    	let div4;
    	let p1;
    	let t11;
    	let t12;
    	let t13;
    	let t14;
    	let div3;
    	let t15;
    	let t16;
    	let div5;
    	let t17;
    	let div6;
    	let hr;
    	let t18;
    	let p2;
    	let t20;
    	let p3;
    	let t21;
    	let a;
    	let t23;
    	let br1;
    	let if_block0 = /*login*/ ctx[8] == 0 && create_if_block_12(ctx);
    	let if_block1 = /*login*/ ctx[8] === 1 && create_if_block_11(ctx);
    	let if_block2 = /*login*/ ctx[8] == 2 && create_if_block_9(ctx);
    	let if_block3 = /*login*/ ctx[8] == 3 && create_if_block_8(ctx);
    	let if_block4 = /*login*/ ctx[8] == 1 && create_if_block_7(ctx);
    	let if_block5 = /*res*/ ctx[15].length > 0 && create_if_block_5(ctx);
    	let if_block6 = /*login*/ ctx[8] == 1 && create_if_block_4(ctx);
    	let if_block7 = /*add*/ ctx[1] && create_if_block_3(ctx);
    	let if_block8 = /*call*/ ctx[6] && create_if_block_2(ctx);
    	let if_block9 = /*clienttask*/ ctx[4].length > 0 && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			if (if_block3) if_block3.c();
    			t3 = space();
    			br0 = element("br");
    			t4 = space();
    			div2 = element("div");
    			p0 = element("p");
    			p0.textContent = "Codeforces";
    			t6 = space();
    			if (if_block4) if_block4.c();
    			t7 = space();
    			div1 = element("div");
    			t8 = space();
    			if (if_block5) if_block5.c();
    			t9 = space();
    			div4 = element("div");
    			p1 = element("p");
    			p1.textContent = "Мои задачи";
    			t11 = space();
    			if (if_block6) if_block6.c();
    			t12 = space();
    			if (if_block7) if_block7.c();
    			t13 = space();
    			if (if_block8) if_block8.c();
    			t14 = space();
    			div3 = element("div");
    			t15 = space();
    			if (if_block9) if_block9.c();
    			t16 = space();
    			div5 = element("div");
    			t17 = space();
    			div6 = element("div");
    			hr = element("hr");
    			t18 = space();
    			p2 = element("p");
    			p2.textContent = "Task Tracker";
    			t20 = space();
    			p3 = element("p");
    			t21 = text("Бочаров Егор Telegram: ");
    			a = element("a");
    			a.textContent = "@egor_bocharov";
    			t23 = space();
    			br1 = element("br");
    			add_location(br0, file, 623, 2, 18269);
    			attr_dev(div0, "id", "auto");
    			attr_dev(div0, "class", "svelte-b6l8o6");
    			add_location(div0, file, 583, 0, 16848);
    			attr_dev(p0, "class", "site-name svelte-b6l8o6");
    			add_location(p0, file, 628, 2, 18307);
    			attr_dev(div1, "class", "flex svelte-b6l8o6");
    			add_location(div1, file, 633, 2, 18464);
    			attr_dev(div2, "class", "table svelte-b6l8o6");
    			add_location(div2, file, 627, 0, 18283);
    			attr_dev(p1, "class", "site-name svelte-b6l8o6");
    			add_location(p1, file, 660, 2, 19535);
    			attr_dev(div3, "class", "flex svelte-b6l8o6");
    			add_location(div3, file, 674, 2, 19959);
    			attr_dev(div4, "class", "table svelte-b6l8o6");
    			add_location(div4, file, 659, 0, 19511);
    			attr_dev(div5, "class", "flex svelte-b6l8o6");
    			add_location(div5, file, 696, 0, 20874);
    			add_location(hr, file, 698, 8, 20932);
    			add_location(p2, file, 699, 8, 20945);
    			attr_dev(a, "target", "_blank");
    			attr_dev(a, "href", "https://teleg.run/bystepdev");
    			add_location(a, file, 700, 35, 21002);
    			add_location(p3, file, 700, 8, 20975);
    			add_location(br1, file, 701, 8, 21087);
    			attr_dev(div6, "class", "bottom svelte-b6l8o6");
    			add_location(div6, file, 697, 0, 20902);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			if (if_block0) if_block0.m(div0, null);
    			append_dev(div0, t0);
    			if (if_block1) if_block1.m(div0, null);
    			append_dev(div0, t1);
    			if (if_block2) if_block2.m(div0, null);
    			append_dev(div0, t2);
    			if (if_block3) if_block3.m(div0, null);
    			append_dev(div0, t3);
    			append_dev(div0, br0);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, p0);
    			append_dev(div2, t6);
    			if (if_block4) if_block4.m(div2, null);
    			append_dev(div2, t7);
    			append_dev(div2, div1);
    			append_dev(div2, t8);
    			if (if_block5) if_block5.m(div2, null);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, p1);
    			append_dev(div4, t11);
    			if (if_block6) if_block6.m(div4, null);
    			append_dev(div4, t12);
    			if (if_block7) if_block7.m(div4, null);
    			append_dev(div4, t13);
    			if (if_block8) if_block8.m(div4, null);
    			append_dev(div4, t14);
    			append_dev(div4, div3);
    			append_dev(div4, t15);
    			if (if_block9) if_block9.m(div4, null);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, div5, anchor);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, div6, anchor);
    			append_dev(div6, hr);
    			append_dev(div6, t18);
    			append_dev(div6, p2);
    			append_dev(div6, t20);
    			append_dev(div6, p3);
    			append_dev(p3, t21);
    			append_dev(p3, a);
    			append_dev(div6, t23);
    			append_dev(div6, br1);
    		},
    		p: function update(ctx, dirty) {
    			if (/*login*/ ctx[8] == 0) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_12(ctx);
    					if_block0.c();
    					if_block0.m(div0, t0);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*login*/ ctx[8] === 1) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_11(ctx);
    					if_block1.c();
    					if_block1.m(div0, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*login*/ ctx[8] == 2) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_9(ctx);
    					if_block2.c();
    					if_block2.m(div0, t2);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (/*login*/ ctx[8] == 3) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);
    				} else {
    					if_block3 = create_if_block_8(ctx);
    					if_block3.c();
    					if_block3.m(div0, t3);
    				}
    			} else if (if_block3) {
    				if_block3.d(1);
    				if_block3 = null;
    			}

    			if (/*login*/ ctx[8] == 1) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_7(ctx);
    					if_block4.c();
    					if_block4.m(div2, t7);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (/*res*/ ctx[15].length > 0) {
    				if (if_block5) {
    					if_block5.p(ctx, dirty);
    				} else {
    					if_block5 = create_if_block_5(ctx);
    					if_block5.c();
    					if_block5.m(div2, null);
    				}
    			} else if (if_block5) {
    				if_block5.d(1);
    				if_block5 = null;
    			}

    			if (/*login*/ ctx[8] == 1) {
    				if (if_block6) {
    					if_block6.p(ctx, dirty);
    				} else {
    					if_block6 = create_if_block_4(ctx);
    					if_block6.c();
    					if_block6.m(div4, t12);
    				}
    			} else if (if_block6) {
    				if_block6.d(1);
    				if_block6 = null;
    			}

    			if (/*add*/ ctx[1]) {
    				if (if_block7) {
    					if_block7.p(ctx, dirty);
    				} else {
    					if_block7 = create_if_block_3(ctx);
    					if_block7.c();
    					if_block7.m(div4, t13);
    				}
    			} else if (if_block7) {
    				if_block7.d(1);
    				if_block7 = null;
    			}

    			if (/*call*/ ctx[6]) {
    				if (if_block8) {
    					if_block8.p(ctx, dirty);
    				} else {
    					if_block8 = create_if_block_2(ctx);
    					if_block8.c();
    					if_block8.m(div4, t14);
    				}
    			} else if (if_block8) {
    				if_block8.d(1);
    				if_block8 = null;
    			}

    			if (/*clienttask*/ ctx[4].length > 0) {
    				if (if_block9) {
    					if_block9.p(ctx, dirty);
    				} else {
    					if_block9 = create_if_block(ctx);
    					if_block9.c();
    					if_block9.m(div4, null);
    				}
    			} else if (if_block9) {
    				if_block9.d(1);
    				if_block9 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(div2);
    			if (if_block4) if_block4.d();
    			if (if_block5) if_block5.d();
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(div4);
    			if (if_block6) if_block6.d();
    			if (if_block7) if_block7.d();
    			if (if_block8) if_block8.d();
    			if (if_block9) if_block9.d();
    			if (detaching) detach_dev(t16);
    			if (detaching) detach_dev(div5);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(div6);
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

    const api = "http://localhost:8080"; // api сервера к которому будем обращаться

    // создает уникальный id мс с начала эпохи
    function getUniq() {
    	let f = new Date();
    	return f.getTime();
    }

    function instance($$self, $$props, $$invalidate) {
    	function handleClick(x) {
    		x = Number(x);

    		if (openComment.has(x)) {
    			openComment.delete(x);
    		} else {
    			openComment.add(x);
    		}

    		$$invalidate(14, openComment);
    	}

    	let name = ""; // handle
    	let num = 0; // для нумерации комментов
    	let add = false; // для открытия понели добавления задач
    	let taskurl = ""; // поле ввода ссылки на задачу
    	let taskname = ""; // поле ввода имени задачи
    	let clienttask = []; // задачи пользователя
    	let result = ""; // ошибка если некоректно ввели данные задачи
    	let call = false;

    	// удаление задачи с CF, чтобы потом понять, что эту задачу удалили, мы ставим ей result = -1
    	async function problemCfDelete(x) {
    		let backup = res[x];
    		let prob_id = backup[6];

    		await fetch(api + "/cf_problems/" + bd_id + "/" + prob_id, { method: "DELETE" }).catch(error => {
    			console.log(error);
    		});

    		const problem_add = {
    			"id": String(getUniq()),
    			"name": String(backup[1]),
    			"link": backup[0],
    			"result": "-1",
    			"comment": String(backup[5])
    		};

    		await fetch(api + "/cf_problems/" + bd_id, {
    			method: "POST",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify(problem_add)
    		}).catch(error => {
    			console.log(error);
    		});

    		res.splice(x, 1);
    		$$invalidate(15, res);
    	}

    	// удаление задачи пользователя
    	async function userProblemDelete(x) {
    		let prob_id = clienttask[x][4];

    		fetch(api + "/user_problems/" + bd_id + "/" + prob_id, { method: "DELETE" }).catch(error => {
    			console.log(error);
    		});

    		clienttask.splice(x, 1);
    		$$invalidate(4, clienttask);
    	}

    	// сохранение комментария для задач пользователя
    	async function saveUserProblem(x) {
    		//удаление из бд данных о старой задаче и создание новой
    		let backup = clienttask[x];

    		let prob_id = clienttask[x][4];

    		await fetch(api + "/user_problems/" + bd_id + "/" + prob_id, { method: "DELETE" }).catch(error => {
    			console.log(error);
    		});

    		const problem_add = {
    			"id": backup[4],
    			"name": backup[1],
    			"link": backup[0],
    			"comment": backup[3]
    		};

    		await fetch(api + "/user_problems/" + bd_id, {
    			method: "POST",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify(problem_add)
    		}).catch(error => {
    			console.log(error);
    		});

    		handleClick(backup[2]);
    	}

    	// сохранение комметария задачи с CF аналогия с задачами пользователя
    	async function saveCfProblem(x) {
    		// repeat func выше
    		let backup = res[x];

    		let prob_id = backup[6];

    		await fetch(api + "/cf_problems/" + bd_id + "/" + prob_id, { method: "DELETE" }).catch(error => {
    			console.log(error);
    		});

    		const newProb = {
    			"id": String(getUniq()),
    			"name": String(backup[1]),
    			"link": backup[0],
    			"result": String(backup[2]) + " " + String(backup[3]),
    			"comment": String(backup[5])
    		};

    		await fetch(api + "/cf_problems/" + bd_id, {
    			method: "POST",
    			headers: { "Content-Type": "application/json" },
    			body: JSON.stringify(newProb)
    		}).catch(error => {
    			console.log(error);
    		});

    		handleClick(backup[4]);
    	}

    	// добавление задачи пользователя
    	function blockAdd() {
    		if (!add) {
    			$$invalidate(1, add = true);
    		} else {
    			if (taskurl.length == 0 && taskname == 0) {
    				$$invalidate(1, add = false);
    				return;
    			}

    			if (taskurl.length == 0) {
    				$$invalidate(5, result = "Добавьте ссылку на задачу");
    				$$invalidate(6, call = true);
    				return;
    			}

    			if (taskname.length == 0) {
    				$$invalidate(5, result = "Добавьте название задачи");
    				$$invalidate(6, call = true);
    				return;
    			}

    			const problem_add = {
    				"id": String(getUniq()),
    				"name": taskname,
    				"link": taskurl,
    				"comment": ""
    			};

    			fetch(api + "/user_problems/" + bd_id, {
    				method: "POST",
    				headers: { "Content-Type": "application/json" },
    				body: JSON.stringify(problem_add)
    			}).then(response => response.json()).then(new_prob => {
    				// ссылка на задачу, название, номер для открытие коммента, комментарий, index в бд
    				let fl = [taskurl, taskname, Number(num), "", new_prob.id];

    				num = num + 1;
    				clienttask.unshift(fl);
    				$$invalidate(4, clienttask);
    				$$invalidate(2, taskurl = "");
    				$$invalidate(3, taskname = "");
    				$$invalidate(6, call = false);
    				$$invalidate(1, add = false);
    			}).catch(error => {
    				console.log(error);
    			});
    		}
    	}

    	// загружает задачи пользователя из бд
    	async function updClientTask() {
    		fetch(api + "/user_problems/" + bd_id).then(response => {
    			return response.json();
    		}).then(response => {
    			for (let i = response.length - 1; i >= 0; i--) {
    				let element = [response[i].link, response[i].name, Number(num), "", response[i].id];
    				num++;

    				if (response[i].comment != undefined) {
    					element[3] = response[i].comment;
    				}

    				clienttask.unshift(element);
    			}

    			$$invalidate(4, clienttask);
    		}).catch(error => {
    			{
    				console.log("Задач пользователя нет");
    			}
    		});
    	}

    	let reload_err = "Обновить"; // состояние кнопки обновления

    	// обновление списка задач codeforces
    	async function updCfProblems() {
    		$$invalidate(7, reload_err = "Обновлнение...");
    		let url = "https://codeforces.com/api/user.status?handle=" + name + "&from=1&count=10000";

    		let response = await fetch(url).catch(error => {
    			// запрос к Codeforces
    			$$invalidate(7, reload_err = "Обновить");
    		});

    		let newCfProblems = await response.json();

    		if (response.ok) {
    			let dbCfProblems = undefined;

    			await fetch(api + "/cf_problems/" + bd_id).then(response => {
    				return response.json();
    			}).then(dbdb => {
    				// запрос к бд
    				dbCfProblems = dbdb;
    			}).catch(error => {
    				$$invalidate(7, reload_err = "Обновить");
    				console.log(error);
    			});

    			console.log("ok");
    			let us = new Set();
    			let ok = new Set();
    			let buffer = [];
    			let Comments = new Map();
    			let Ids = new Map();
    			console.log(newCfProblems.result);

    			for (let element of newCfProblems.result) {
    				// записывает все нерешенные задачи с codeforces
    				let problem = element.problem;

    				let name = String(element.problem.contestId) + "/problem/" + String(element.problem.index);

    				if (String(element.verdict) != "OK" && !us.has(name)) {
    					us.add(name);

    					buffer.push([
    						name,
    						element.problem.name,
    						Number(element.passedTestCount),
    						String(element.verdict)
    					]);
    				} else {
    					ok.add(name);
    				}
    			}

    			while (res.length > 0) {
    				// чистит список задач с Cf
    				res.pop();
    			}

    			let notSolvedTasks = [];

    			for (let element of buffer) {
    				// генерирует список нерешенных задач
    				let name = element[0];

    				if (us.has(name) && !ok.has(name)) {
    					us.delete(name);
    					element.push(num);
    					element.push("");
    					element.push("");
    					num += 1;
    					notSolvedTasks.unshift(element);
    				}
    			}

    			let setDbProblems = new Set();
    			let delTasks = new Set();

    			if (dbCfProblems != undefined) {
    				for (let i = 0; i < dbCfProblems.length; i++) {
    					setDbProblems.add(dbCfProblems[i].link);
    					Comments.set(dbCfProblems[i].link, dbCfProblems[i].comment);
    					Ids.set(dbCfProblems[i].link, dbCfProblems[i].id);

    					if (dbCfProblems[i].result === "-1") {
    						delTasks.add(dbCfProblems[i].link);
    					}
    				}
    			}

    			let addTask = [];

    			for (let i = 0; i < notSolvedTasks.length; i++) {
    				let element = notSolvedTasks[i];
    				let taskLink = element[0];

    				if (!setDbProblems.has(taskLink)) {
    					addTask.unshift(element);
    				} else {
    					if (Comments.get(element[0]) != undefined) {
    						element[5] = Comments.get(element[0]);
    					} else {
    						element[5] = "";
    					}

    					element[6] = Ids.get(element[0]);
    					if (!delTasks.has(element[0])) res.unshift(element);
    				}
    			}

    			$$invalidate(15, res);

    			for (let i = addTask.length - 1; i >= 0; i--) {
    				let element = addTask[i];
    				$$invalidate(7, reload_err = "Обновление...");

    				const newProb = {
    					"id": String(getUniq()),
    					"name": String(element[1]),
    					"link": element[0],
    					"result": String(element[2]) + " " + String(element[3]),
    					"comment": ""
    				};

    				fetch(api + "/cf_problems/" + bd_id, {
    					method: "POST",
    					headers: { "Content-Type": "application/json" },
    					body: JSON.stringify(newProb)
    				}).then(response => {
    					response.json();
    				}).then(response => {
    					$$invalidate(7, reload_err = "Обновить");
    					res.unshift(element);
    					$$invalidate(15, res);
    				});
    			}

    			$$invalidate(7, reload_err = "Обновить");
    		} else {
    			$$invalidate(7, reload_err = "Обновить");
    			alert("Ошибка HTTP: " + response.status);
    		}
    	}

    	let login = 0; // состояние авторизации 
    	let mail = ""; // логин
    	let password = ""; // пароль
    	let bd_id = ""; // id пользователя
    	let login_err = ""; // сообщение о проблемах со входом
    	let reg_err = ""; // сообщение о проблеме с регистрацией

    	// регистрация
    	async function UserReg() {
    		$$invalidate(12, reg_err = "");

    		if (mail != "" && password != "") {
    			let goodAsk = true;

    			let response = await fetch(api + "/user/" + mail).catch(error => {
    				goodAsk = false;
    			});

    			if (!goodAsk) {
    				$$invalidate(12, reg_err = "Какие-то проблемы, попробуйте позже");
    				return;
    			}

    			if (response.ok) {
    				$$invalidate(12, reg_err = "Такой логин уже существует");
    			} else {
    				$$invalidate(8, login = 3);
    			}
    		} else {
    			$$invalidate(12, reg_err = "Неверный формал логина или пароля");
    		}
    	}

    	// кнопка регистрации
    	function Registr() {
    		$$invalidate(8, login = 2);
    	}

    	let save_err = "";

    	// сохранение хэндла и окончание регистрации
    	async function saveHandle() {
    		$$invalidate(13, save_err = "");
    		let url = "https://codeforces.com/api/user.info?handles=" + name;
    		let goodAsk = true;

    		let response = await fetch(url).catch(error => {
    			goodAsk = false;
    		});

    		if (!goodAsk) {
    			$$invalidate(13, save_err = "Что-то пошло не так, проверьте вводимый Хэндл");
    			return;
    		}

    		if (response.ok) {
    			const user = {
    				"handle": name,
    				mail,
    				"password": MD5(password)
    			};

    			fetch(api + "/user", {
    				method: "POST",
    				headers: { "Content-Type": "application/json" },
    				body: JSON.stringify(user)
    			}).then(response => response.json()).then(new_user => {
    				$$invalidate(8, login = 0);
    				$$invalidate(13, save_err = "");
    				$$invalidate(11, login_err = "Регистрация прошла успешно!");
    			}).catch(error => {
    				$$invalidate(13, save_err = "Технические шоколадки");
    			});
    		} else {
    			$$invalidate(13, save_err = "Что-то пошло не так, проверьте вводимый Хэндл");
    		}
    	}

    	// авторизация и проверка пароля логина
    	async function UserLogin() {
    		$$invalidate(11, login_err = "");

    		if (mail != "" && password != "") {
    			let res = await fetch(api + "/user/" + mail).catch(error => {
    				$$invalidate(11, login_err = "Технические шоколадки");
    			});

    			if (login_err == "") {
    				if (!res.ok) {
    					$$invalidate(11, login_err = "Такого логина не существует");
    				} else {
    					fetch(api + "/user/" + mail).then(response => {
    						return response.json();
    					}).then(response => {
    						if (MD5(password) == response.password) {
    							$$invalidate(10, password = "");
    							$$invalidate(0, name = response.handle);
    							bd_id = response.id;
    							updClientTask();
    							updCfProblems();
    							$$invalidate(8, login = 1);
    						} else {
    							$$invalidate(11, login_err = "Неверный пароль");
    						}
    					}).catch(error => {
    						$$invalidate(11, login_err = "Технические шоколадки");
    					});
    				}
    			}
    		} else {
    			$$invalidate(11, login_err = "Неверный формат");
    		}
    	}

    	// выход из аккаунта
    	function logout() {
    		res.splice(0, res.length);
    		clienttask.splice(0, clienttask.length);
    		$$invalidate(9, mail = "");
    		$$invalidate(0, name = "");
    		$$invalidate(10, password = "");
    		$$invalidate(8, login = 0);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function input0_input_handler() {
    		mail = this.value;
    		$$invalidate(9, mail);
    	}

    	function input1_input_handler() {
    		password = this.value;
    		$$invalidate(10, password);
    	}

    	const click_handler = () => UserLogin();
    	const click_handler_1 = () => Registr();
    	const click_handler_2 = () => logout();

    	function input0_input_handler_1() {
    		mail = this.value;
    		$$invalidate(9, mail);
    	}

    	function input1_input_handler_1() {
    		password = this.value;
    		$$invalidate(10, password);
    	}

    	const click_handler_3 = () => UserReg();

    	function input_input_handler() {
    		name = this.value;
    		$$invalidate(0, name);
    	}

    	const click_handler_4 = () => saveHandle();
    	const click_handler_5 = () => updCfProblems();
    	const click_handler_6 = i => problemCfDelete(i);
    	const click_handler_7 = ar => handleClick(ar[4]);

    	function textarea_input_handler(ar) {
    		ar[5] = this.value;
    		$$invalidate(15, res);
    	}

    	const click_handler_8 = i => saveCfProblem(i);
    	const click_handler_9 = () => blockAdd();

    	function input0_input_handler_2() {
    		taskurl = this.value;
    		$$invalidate(2, taskurl);
    	}

    	function input1_input_handler_2() {
    		taskname = this.value;
    		$$invalidate(3, taskname);
    	}

    	const click_handler_10 = i => userProblemDelete(i);
    	const click_handler_11 = ar => handleClick(ar[2]);

    	function textarea_input_handler_1(ar) {
    		ar[3] = this.value;
    		$$invalidate(4, clienttask);
    	}

    	const click_handler_12 = i => saveUserProblem(i);

    	$$self.$capture_state = () => ({
    		MD5,
    		getUniq,
    		api,
    		handleClick,
    		name,
    		num,
    		add,
    		taskurl,
    		taskname,
    		clienttask,
    		result,
    		call,
    		problemCfDelete,
    		userProblemDelete,
    		saveUserProblem,
    		saveCfProblem,
    		blockAdd,
    		updClientTask,
    		reload_err,
    		updCfProblems,
    		login,
    		mail,
    		password,
    		bd_id,
    		login_err,
    		reg_err,
    		UserReg,
    		Registr,
    		save_err,
    		saveHandle,
    		UserLogin,
    		logout,
    		openComment,
    		res
    	});

    	$$self.$inject_state = $$props => {
    		if ("name" in $$props) $$invalidate(0, name = $$props.name);
    		if ("num" in $$props) num = $$props.num;
    		if ("add" in $$props) $$invalidate(1, add = $$props.add);
    		if ("taskurl" in $$props) $$invalidate(2, taskurl = $$props.taskurl);
    		if ("taskname" in $$props) $$invalidate(3, taskname = $$props.taskname);
    		if ("clienttask" in $$props) $$invalidate(4, clienttask = $$props.clienttask);
    		if ("result" in $$props) $$invalidate(5, result = $$props.result);
    		if ("call" in $$props) $$invalidate(6, call = $$props.call);
    		if ("reload_err" in $$props) $$invalidate(7, reload_err = $$props.reload_err);
    		if ("login" in $$props) $$invalidate(8, login = $$props.login);
    		if ("mail" in $$props) $$invalidate(9, mail = $$props.mail);
    		if ("password" in $$props) $$invalidate(10, password = $$props.password);
    		if ("bd_id" in $$props) bd_id = $$props.bd_id;
    		if ("login_err" in $$props) $$invalidate(11, login_err = $$props.login_err);
    		if ("reg_err" in $$props) $$invalidate(12, reg_err = $$props.reg_err);
    		if ("save_err" in $$props) $$invalidate(13, save_err = $$props.save_err);
    		if ("openComment" in $$props) $$invalidate(14, openComment = $$props.openComment);
    		if ("res" in $$props) $$invalidate(15, res = $$props.res);
    	};

    	let openComment;
    	let res;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	 $$invalidate(14, openComment = new Set());
    	 $$invalidate(15, res = []); // список задач с CF

    	return [
    		name,
    		add,
    		taskurl,
    		taskname,
    		clienttask,
    		result,
    		call,
    		reload_err,
    		login,
    		mail,
    		password,
    		login_err,
    		reg_err,
    		save_err,
    		openComment,
    		res,
    		handleClick,
    		problemCfDelete,
    		userProblemDelete,
    		saveUserProblem,
    		saveCfProblem,
    		blockAdd,
    		updCfProblems,
    		UserReg,
    		Registr,
    		saveHandle,
    		UserLogin,
    		logout,
    		num,
    		bd_id,
    		updClientTask,
    		input0_input_handler,
    		input1_input_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		input0_input_handler_1,
    		input1_input_handler_1,
    		click_handler_3,
    		input_input_handler,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7,
    		textarea_input_handler,
    		click_handler_8,
    		click_handler_9,
    		input0_input_handler_2,
    		input1_input_handler_2,
    		click_handler_10,
    		click_handler_11,
    		textarea_input_handler_1,
    		click_handler_12
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {}, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
