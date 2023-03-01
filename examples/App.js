import Hello from './components/Hello'

export default {
  name: 'App',
  render () {
    return {
      tag: 'div',
      text: 'App',
      data: {
        obj: {
          foo: 1,
          bar: 2
        }
      },
      props: {
        onClick: () => {
          alert('Test')
        }
      },
      style: 'cursor: pointer; line-height: 30px',
      children: [
        { tag: Hello }
      ]
    }
  }
}