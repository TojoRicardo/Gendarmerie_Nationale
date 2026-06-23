import { useEffect } from 'react'

const PageMeta = ({ title, children }) => {
  useEffect(() => {
    if (title) {
      document.title = title
    }
  }, [title])

  return children
}

export default PageMeta
