import { usePermissions } from '../hooks/usePermissions'

const ProtectedAction = ({ 
  permission, 
  permissions, 
  requireAll = false,
  children, 
  fallback = null 
}) => {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions()

  let hasAccess = false

  if (permission) {
    hasAccess = hasPermission(permission)
  } else if (permissions) {
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions)
  }

  if (!hasAccess) {
    return fallback
  }

  return children
}

export default ProtectedAction

