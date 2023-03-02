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
// 定义一个任务队列,Set自动去重
const jobQueue = new Set()
// 创建Promise实例，用这个实例将任务添加到微任务队列
const p = Promise.resolve()

let isFlushing = false
function flushJob() {
  if (isFlushing) return
  isFlushing = true
  console.log(11111)
  p.then(() => {
    console.log('then')
    jobQueue.forEach(job => job())
  }).finally(() => {
    console.log('finally')
    isFlushing = false
  })
}

const effectFn = effect(() => {
  console.log('effectFn')
  console.log(obj.num)
}, {
  scheduler(fn) {
    console.log('scheduler')
    jobQueue.add(fn)
    flushJob()
  },
  lazy: true
})

effectFn()
console.log('num')
obj.num++
obj.num++
obj.num++

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
// const obj = ProxyObj({ foo: 1, boo: 1, baz: { color: 10 }})
// watch(() => obj.foo, (val) => {
//   console.log('监听obj：', val)
// })

// const timer = setInterval(() => {
//   if (obj.foo > 3) {
//     clearInterval(timer)
//     return
//   }
//   obj.foo++
// }, 1000)