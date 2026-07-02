import { RouterProvider } from 'react-router-dom'
import { getRouter } from './app/router'

export default function App() {
  return <RouterProvider router={getRouter()} />
}
