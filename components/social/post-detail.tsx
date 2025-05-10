import Post from "./post"

interface PostDetailProps {
  post?: any
}

export default function PostDetail({ post }: PostDetailProps) {
  // This is a minimal implementation to satisfy the dependency
  // This component is scheduled for removal once all references are identified
  return <div className="hidden">{post && <Post {...post} />}</div>
}
