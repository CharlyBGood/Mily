interface NotificationListProps {
  notifications?: any[]
}

export default function NotificationList({ notifications = [] }: NotificationListProps) {
  // This is a minimal implementation to satisfy the dependency
  // This component is scheduled for removal once all references are identified
  return (
    <div className="hidden">
      {notifications.map((notification, index) => (
        <div key={index}>{notification.message}</div>
      ))}
    </div>
  )
}
