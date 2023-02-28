import ProxyObj from './reactive'


export default class MiniVue {
  constructor (options) {
    this.render = options.render
    this.el = options.el || document.body
    this.VNode = ''
    this.components = options.components || {}
    this.init()
  }
  init () {
    if (this.render) {
      this.VNode = this.render()
      this.renderHandler(this.VNode, this.el)
    }
  }

  renderHandler (VNode, parent) { // 渲染器
    const { tag } = VNode
    if (typeof tag === 'string') { // 原生Dom
      this.mountElement(VNode, parent)
    } else if (typeof tag === 'object') { // vue组件
      this.mountComponent(VNode, parent)
    }
  }

  mountElement (VNode, parent) {
    const { tag, text = '', children, classes = '', style = '' } = VNode
    const dom = document.createElement(tag)
    text && (dom.innerText = text)
    classes && dom.setAttribute('class', classes)
    style && dom.setAttribute('style', style)
    if (children && children.length) {
      children.forEach(child => {
        this.renderHandler(child, dom)
      })
    }
    for (let key in VNode.props) { // 绑定事件
      if (/^on/.test(key)) {
        dom.addEventListener(key.substring(2).toLowerCase(),
        VNode.props[key])
      }
    }
    parent.appendChild(dom)
  }

  mountComponent (VNode, parent) {
    return this.renderHandler(VNode.tag.render(), parent)
  }
}