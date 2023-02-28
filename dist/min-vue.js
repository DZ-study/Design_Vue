(function () {
  'use strict';

  const stack = new WeakMap();
  let activeEffect; // ???

  function effect(fn) {
    // const effectFn = () => {
    //   cleanup(effectFn)
    //   activeEffect = effectFn
    // }
    activeEffect = fn;
    fn();
  }

  function track(target, key) { // get拦截函数内调用track函数追踪变化
    if (!activeEffect) return target[key]
    let depsMap = stack.get(target);
    if (!depsMap) {
      stack.set(target, (depsMap = new Map()));
    }
    let deps = depsMap.get(key); // 副作用函数集合
    if (!deps) {
      depsMap.set(key, (deps = new Set()));
    }
    deps.add(activeEffect);
  }

  function trigger(target, key) { // set拦截函数内调用trigger函数触发变化
    const depsMap = stack.get(target);
    if (!depsMap) return
    const effects = depsMap.get(key);
    effects && effects.forEach(fn => fn());
  }

  // 对原始数据的代理
  function ProxyObj (data, effect) {
    return new Proxy(data, {
      get(target, key) {
        track(target, key);
        return target[key]
      },
      set(target, key, newVal) {
        target[key] = newVal;
        trigger(target, key);
        return true
      }
    })
  }
  const data = { ok: true, text: 'hello world' };
  const obj = ProxyObj(data);
  effect(function effectFn() {
    console.log('effect function...', data);
    /**
     * obj.ok为false时，修改obj.text，依然会触发副作用
     * 正常情况不需要再次触发副作用函数
     * 优化最开始的effect函数↑
     */
    document.body.innerText = obj.ok ? obj.text : 'not';
  });
  setTimeout(() => {
    obj.ok = false;
  }, 1000);

  setTimeout(() => {
    obj.text = 'ddd';
  }, 2000);

  class MiniVue {
    constructor (options) {
      this.render = options.render;
      this.el = options.el || document.body;
      this.VNode = '';
      this.components = options.components || {};
      this.init();
    }
    init () {
      if (this.render) {
        this.VNode = this.render();
        this.renderHandler(this.VNode, this.el);
      }
    }

    renderHandler (VNode, parent) { // 渲染器
      const { tag } = VNode;
      if (typeof tag === 'string') { // 原生Dom
        this.mountElement(VNode, parent);
      } else if (typeof tag === 'object') { // vue组件
        this.mountComponent(VNode, parent);
      }
    }

    mountElement (VNode, parent) {
      const { tag, text = '', children, classes = '', style = '' } = VNode;
      const dom = document.createElement(tag);
      text && (dom.innerText = text);
      classes && dom.setAttribute('class', classes);
      style && dom.setAttribute('style', style);
      if (children && children.length) {
        children.forEach(child => {
          this.renderHandler(child, dom);
        });
      }
      for (let key in VNode.props) { // 绑定事件
        if (/^on/.test(key)) {
          dom.addEventListener(key.substring(2).toLowerCase(),
          VNode.props[key]);
        }
      }
      parent.appendChild(dom);
    }

    mountComponent (VNode, parent) {
      return this.renderHandler(VNode.tag.render(), parent)
    }
  }

  var Hello = {
    name: 'Hello',
    render() {
      return {
        tag: 'div',
        text: 'Hello',
        style: 'color: #7ecd7e; font-size: 12px'
      }
    }
  };

  var App = {
    name: 'App',
    render () {
      return {
        tag: 'div',
        text: 'App',
        props: {
          onClick: () => {
            alert('Test');
          }
        },
        style: 'cursor: pointer; line-height: 30px',
        children: [
          { tag: Hello }
        ]
      }
    }
  };

  new MiniVue({
    el: document.getElementById("app"),
    render () {
      return {
        tag: App
      }
    }
    // render () {
    //   return {
    //     tag: 'div',
    //     children: [{
    //       tag: 'h4',
    //       text: '1111'
    //     },{
    //       tag: 'h3',
    //       text: '1111'
    //     },{
    //       tag: 'h2',
    //       text: '1111'
    //     }]
    //   }
    // }
  });

})();
