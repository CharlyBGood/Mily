import Post from "./post"

interface PostListProps {
  posts?: any[]
}

export default function PostList({ posts = [] }: PostListProps) {
  // This is a minimal implementation to satisfy the dependency
  // This component is scheduled for removal once all references are identified
  return (
    <div className="hidden">
      {posts.map((post) => (
        <Post key={post.id} {...post} />
      ))}
    </div>
  )
}
