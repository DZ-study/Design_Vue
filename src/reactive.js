/**
 * 副作用函数 effect:
 * effect本身不是副作用函数，是注册副作用函数的注册器
 * 比如监听响应式变化，注册一个
 */

const stack = new WeakMap()
let activeEffect
const effectStack = [] // effect栈

function cleanup(effectFn) {
  if (effectFn.deps) {
    /**
     * 示例：
     * arr = [new Set([1,2,3]), new Set([2,3,4])]
     * arr.forEach(a => {a.delete(2)})
     * ↓
     * arr = [Set(2){1, 3}, Set(2){3, 4}]
     */
    effectFn.deps.forEach(deps => {
      deps.delete(effectFn)
    })
    effectFn.deps.length = 0
  }
}

function effect(fn, options = {}) {
  // TODO: 不太明白
  const effectFn = () => {
    cleanup(effectFn)
    activeEffect = effectFn
    // 调用副作用函数之前压入栈
    effectStack.push(effectFn)
    const res = fn()
    effectStack.pop()
    // 调用副作用函数之后弹出栈，重新赋值activeEffect
    activeEffect = effectStack[effectStack.length - 1]
    // 返回副作用函数的执行结果
    return res
  }
  // options挂载到effectFn上
  effectFn.options = options
  effectFn.deps = []
  if (!options.lazy) {
    // 执行副作用函数
    effectFn()
  }
  return effectFn // 把副作用函数作为返回值返回
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
  // 收集依赖
  activeEffect.deps.push(deps)
}

function trigger(target, key) { // set拦截函数内调用trigger函数触发变化
  const depsMap = stack.get(target)
  if (!depsMap) return
  const effects = depsMap.get(key)
  // new Set 复制一遍防止死循环
  const effectsToRun = new Set()
  effects && effects.forEach(effectFn => {
    if (effectFn !== activeEffect) { // 防止循环触发同一个effect，导致栈溢出
      effectsToRun.add(effectFn)
    }
  })
  effectsToRun.forEach(fn => {
    // 如果副作用函数包含调度器，调用调度器，把副作用函数抛出去
    if(fn.options.scheduler) {
      fn.options.scheduler(fn)
    } else {
      fn()
    }
  })
}
// 读取操作对监听响应式有什么用
function traverse(value, seen = new Set()) {
  if (typeof value !== 'object' || value === null || seen.has(value)) return
  seen.add(value)
  for (const k in value) {
    traverse(value[k], seen)
  }
  return value
}

// 实现计算属性函数
export function computed(getter) {
  // value 用来缓存上一次的计算值
  let value
  // dirty 标识是否需要重新计算
  let dirty = true

  const effectFn = effect(getter, {
    lazy: true,
    scheduler(fn) { // 值变化会触发调度器，此时重置dirty为true
      dirty = true
      fn()
    }
  })

  const obj = {
    get value() {
      if (dirty) {
        value = effectFn()
        dirty = false
      }
      return value
    }
  }

  return obj
}

// 实现watch函数
export function watch(source, cb, options = {}) {
  let oldVal, newVal

  // cleanup 存储用户注册的过期回调
  let cleanup
  // 定义onInvalidate函数
  function onInvalidate(fn) {
    cleanup = fn
  }

  const job = () => {
    newVal = effectFn()
    // 在回调之前，先调用过期回调
    if (cleanup) cleanup()
    cb(newVal, oldVal, onInvalidate)
    oldVal = JSON.parse(JSON.stringify(newVal))
  }

  const effectFn = effect(
    // 递归遍历
    () => traverse(source),
    {
      lazy: true,
      scheduler() { // 数据变化时，调用传入的回调函数
        if (options.flush === 'post') {
          const p = Promise.resolve()
          p.then(job)
        } else {
          job()
        }
      }
    }
  )
  if (options.immediate) { // 立即触发
    job()
  } else {
    oldVal = effectFn()
  }
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

/*------------------effect调度执行次数测试---------------------*/
const data = { ok: true, text: 'hello world', bar: 'wwww', foo: '3333', num: 1 }
const obj = ProxyObj(data)
// // 定义一个任务队列,Set自动去重
// const jobQueue = new Set()
// // 创建Promise实例，用这个实例将任务添加到微任务队列
// const p = Promise.resolve()

// let isFlushing = false
// function flushJob() {
//   if (isFlushing) return
//   isFlushing = true
//   console.log(11111)
//   p.then(() => {
//     console.log('then')
//     setTimeout(() => {
//       console.log('setTimeout3...');
//     }, 1000)
//     jobQueue.forEach(job => job())
//   }).finally(() => {
//     console.log('finally')
//     isFlushing = false
//   })
// }

// const effectFn = effect(() => {
//   console.log('effectFn: ', obj.num)
// }, {
//   scheduler(fn) {
//     console.log('scheduler')
//     jobQueue.add(fn)
//     flushJob()
//   },
//   lazy: true
// })

// effectFn()
// console.log('num')


let finalData = null

watch(obj, async(val, oldVal, onInvalidate) => {
  let expired = false
  onInvalidate(() => {
    expired = true
  })

  const res = new Promise(resolve => {
    return setTimeout(() => {
      resolve(obj.num * (new Date()).getMilliseconds())
    }, 1000)
  })

  const test = await res

  if (!expired) {
    finalData = test
    console.log('finalData: ', finalData)
  }
})
obj.num++
setTimeout(() => {
  obj.num++
}, 200)
setTimeout(() => {
  obj.num++
}, 300)
setTimeout(() => {
  obj.num++
}, 400)
setTimeout(() => {
  obj.num++
}, 5000)

// const timer = setInterval(() => {
//   if (obj.num > 10) {
//     clearInterval(timer)
//     return
//   }
//   obj.num+=2
// }, 1000)

export default ProxyObj
