import { RouterProvider } from 'react-router'
import { getRouter } from './app/router'

export default function App() {
  return <RouterProvider router={getRouter()} />
}
