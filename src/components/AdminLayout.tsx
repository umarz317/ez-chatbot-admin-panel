import { Link, NavLink, Outlet } from 'react-router-dom'
import { ChatBubbleLeftRightIcon, ArrowRightStartOnRectangleIcon, LifebuoyIcon, UsersIcon } from '@heroicons/react/24/outline'

type AdminLayoutProps = {
  onLogout: () => void
}

export function AdminLayout({ onLogout }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F6F6F7] text-[#202223]">
      <header className="sticky top-0 z-10 bg-[#004C3F] shadow-md">
        <div className="mx-auto flex w-[95%] max-w-6xl flex-col gap-2 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/conversations" className="no-underline">
            <img
              src="/logo.png"
              alt="EzXports"
              className="w-24 rounded object-contain brightness-0 invert"
            />
          </Link>

          <nav className="-mx-1 flex w-full items-center gap-1 overflow-x-auto px-1 pb-1 sm:mx-0 sm:w-auto sm:px-0 sm:pb-0">
            <NavLink
              to="/conversations"
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium no-underline transition ${isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              Conversations
            </NavLink>
            <NavLink
              to="/tickets"
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium no-underline transition ${isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <LifebuoyIcon className="h-4 w-4" />
              Tickets
            </NavLink>
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium no-underline transition ${isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <UsersIcon className="h-4 w-4" />
              Users
            </NavLink>

            <div className="mx-1.5 hidden h-5 w-px bg-white/20 sm:block" />

            <button
              type="button"
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
              onClick={onLogout}
              title="Logout"
              aria-label="Logout"
            >
              <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
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
