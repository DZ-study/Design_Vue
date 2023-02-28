const stack = new WeakMap()
let activeEffect // ???

function effect(fn) {
  // const effectFn = () => {
  //   cleanup(effectFn)
  //   activeEffect = effectFn
  // }
  activeEffect = fn
  fn()
}

function track(target, key) { // get拦截函数内调用track函数追踪变化
  if (!activeEffect) return target[key]
  let depsMap = stack.get(target)
  if (!depsMap) {
    stack.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key) // 副作用函数集合
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffect)
}

function trigger(target, key) { // set拦截函数内调用trigger函数触发变化
  const depsMap = stack.get(target)
  if (!depsMap) return
  const effects = depsMap.get(key)
  effects && effects.forEach(fn => fn())
}

// 对原始数据的代理
function ProxyObj (data, effect) {
  return new Proxy(data, {
    get(target, key) {
      track(target, key)
      return target[key]
    },
    set(target, key, newVal) {
      target[key] = newVal
      trigger(target, key)
      return true
    }
  })
}
const data = { ok: true, text: 'hello world' }
const obj = ProxyObj(data)
effect(function effectFn() {
  console.log('effect function...', data)
  /**
   * obj.ok为false时，修改obj.text，依然会触发副作用
   * 正常情况不需要再次触发副作用函数
   * 优化最开始的effect函数↑
   */
  document.body.innerText = obj.ok ? obj.text : 'not'
})
setTimeout(() => {
  obj.ok = false
}, 1000)

setTimeout(() => {
  obj.text = 'ddd'
}, 2000)


export default ProxyObj
