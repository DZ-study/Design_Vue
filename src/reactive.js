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
export function watch(source, cb) {
  effect(
    // 递归遍历
    () => traverse(source),
    {
      scheduler() { // 数据变化时，调用传入的回调函数
        cb(source)
      }
    }
  )
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
// const data = { ok: true, text: 'hello world', bar: 'wwww', foo: '3333', num: 1 }
// const obj = ProxyObj(data)
/*------------------effect基础测试---------------------*/
// effect(function effectFn() {
//   console.log('effect function...', data)
//   /**
//    * obj.ok为false时，修改obj.text，依然会触发副作用
//    * 正常情况不需要再次触发副作用函数
//    * 优化最开始的effect函数 ↑
//    */
//   document.body.innerText = obj.ok ? obj.text : 'not'
// })
// setTimeout(() => {
//   obj.ok = false
// }, 1000)

// setTimeout(() => {
//   obj.text = 'ddd'
// }, 2000)


/*------------------effect嵌套测试---------------------*/
// let temp1, temp2
// effect(() => {
//   console.log('effectFn1 执行', obj)
//   effect(() => {
//     console.log('effectFn2 执行', obj)
//     temp2 = obj.bar
//   })
//   temp1 = obj.foo
// })

// setTimeout(() => {
//   obj.bar = '121212'
// }, 1000)

// setTimeout(() => {
//   obj.foo = '3434343'
// }, 2000)

/*------------------effect调度执行时机测试---------------------*/
// effect(() => {
//   console.log(obj.num)
// }, {
//   scheduler(fn) {
//     // setTimeout(fn)
//     fn()
//   }
// })
// obj.num++
// obj.num++
// console.log('end...')

/*------------------effect调度执行次数测试---------------------*/
// // 定义一个任务队列,Set自动去重
// const jobQueue = new Set()
// // 创建Promise实例，用这个实例将任务添加到微任务队列
// const p = Promise.resolve()

// let isFlushing = false
// function flushJob() {
//   if (isFlushing) return
//   isFlushing = true
//   p.then(() => {
//     jobQueue.forEach(job => job())
//   }).finally(() => {
//     isFlushing = false
//   })
// }

// const effectFn = effect(() => {
//   console.log(obj.num)
// }, {
//   scheduler(fn) {
//     jobQueue.add(fn)
//     flushJob()
//   },
//   lazy: true
// })

// effectFn()

// obj.num++
// obj.num++
// obj.num++

/*------------------计算属性的实现与测试---------------------*/
// const data1 = { foo: 1, bar: 2 }
// const obj1 = ProxyObj(data1)
// const sumRes = computed(() => {
  // return {
  //   get (val) {
  //     return val
  //   },
  //   set () {}
  // }
//   console.log('computed: ');
//   return obj1.foo + obj1.bar
// })

// console.log(sumRes.value)

/*------------------watch监听相适应变化测试-------------------*/
const obj = ProxyObj({ foo: 1, boo: 1, baz: { color: 10 }})
watch(() => obj.foo, (val) => {
  console.log('监听obj：', val)
})

const timer = setInterval(() => {
  if (obj.foo > 3) {
    clearInterval(timer)
    return
  }
  obj.foo++
}, 1000)


export default ProxyObj
