import { Link, NavLink, Outlet } from 'react-router-dom'
import { ChatBubbleLeftRightIcon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'

type AdminLayoutProps = {
  onLogout: () => void
}

export function AdminLayout({ onLogout }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F6F6F7] text-[#202223]">
      <header className="sticky top-0 z-10 bg-[#004C3F] shadow-md">
        <div className="mx-auto flex w-[95%] max-w-6xl items-center justify-between py-2.5">
          <Link to="/conversations" className="no-underline">
            <img
              src="/logo.png"
              alt="EzXports"
              className="w-24 rounded object-contain brightness-0 invert"
            />
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink
              to="/conversations"
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium no-underline transition ${isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              Conversations
            </NavLink>

            <div className="mx-1.5 h-5 w-px bg-white/20" />

            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              onClick={onLogout}
            >
              <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-[95%] max-w-6xl py-5 sm:py-6">
        <Outlet />
      </main>
    </div>
  )
}
