"use client"

interface CreatePostProps {
  onSubmit?: (post: any) => void
}

export default function CreatePost({ onSubmit }: CreatePostProps) {
  // This is a minimal implementation to satisfy the dependency
  // This component is scheduled for removal once all references are identified
  return (
    <div className="hidden">
      <form>
        <button type="button" onClick={() => onSubmit && onSubmit({})}>
          Create Post
        </button>
      </form>
    </div>
  )
}
