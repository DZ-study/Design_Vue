import ProxyObj from './reactive'


export default class MiniVue {
  constructor (options) {
    this.options = options
    this.render = options.render
    this.el = options.el || document.body
    this.vnode = ''
    this.components = options.components || {}
    this.init()
  }
  init () {
    if (this.render) {
      this.vnode = this.render()
      this.renderHandler(this.vnode, this.el)
    }
  }

  renderHandler (vnode, parent) { // 渲染器
    // 把data转化为响应式数据挂载到vnode上
    if (vnode.data) {
      vnode.$data = ProxyObj(vnode.data)
    }
    const { tag } = vnode
    if (typeof tag === 'string') { // 原生Dom
      this.mountElement(vnode, parent)
    } else if (typeof tag === 'object') { // component组件
      this.mountComponent(vnode, parent)
    }
  }

  mountElement (vnode, parent) {
    const { tag, text = '', children, classes = '', style = '' } = vnode
    const dom = document.createElement(tag)
    text && (dom.innerText = text)
    classes && dom.setAttribute('class', classes)
    style && dom.setAttribute('style', style)
    if (children && children.length) {
      children.forEach(child => {
        this.renderHandler(child, dom)
      })
    }
    for (let key in vnode.props) { // 绑定事件
      if (/^on/.test(key)) {
        dom.addEventListener(key.substring(2).toLowerCase(),
        vnode.props[key])
      }
    }
    parent.appendChild(dom)
  }

  mountComponent (vnode, parent) {
    return this.renderHandler(vnode.tag.render(), parent)
  }
}