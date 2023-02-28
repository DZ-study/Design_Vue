import MiniVue from './src/main'
import App from './examples/App'

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
})