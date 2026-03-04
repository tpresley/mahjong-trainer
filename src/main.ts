import { run, enableHMR } from 'sygnal'
import RootComponent from './RootComponent'
import './styles.css'

const app = run(RootComponent)

if (import.meta.hot) {
  enableHMR(app, import.meta.hot, () => import('./RootComponent') as any, './RootComponent')
}
