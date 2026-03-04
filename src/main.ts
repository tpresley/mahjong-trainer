import { run } from 'sygnal'
import RootComponent from './RootComponent'
import './styles.css'

const { hmr, dispose } = run(RootComponent)

if (import.meta.hot) {
  import.meta.hot.accept('./RootComponent', hmr)
  import.meta.hot.dispose(dispose)
}
