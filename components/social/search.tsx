"use client"

interface SearchProps {
  onSearch?: (query: string) => void
}

export default function Search({ onSearch }: SearchProps) {
  // This is a minimal implementation to satisfy the dependency
  // This component is scheduled for removal once all references are identified
  return (
    <div className="hidden">
      <input type="text" placeholder="Search..." onChange={(e) => onSearch && onSearch(e.target.value)} />
    </div>
  )
}
