import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getPreferredLocaleFromHeader, isLocale, LOCALE_COOKIE_NAME } from '@/lib/i18n/config'

const PUBLIC_PATHS = ['/login', '/auth/callback', '/auth/session']

function resolveRequestLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value
  if (isLocale(cookieLocale)) return cookieLocale
  return getPreferredLocaleFromHeader(request.headers.get('accept-language'))
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const locale = resolveRequestLocale(request)

  if (!isLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value)) {
    supabaseResponse.cookies.set(LOCALE_COOKIE_NAME, locale, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    })
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (!user && !PUBLIC_PATHS.some((p) => path.startsWith(p))) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    redirectResponse.cookies.set(LOCALE_COOKIE_NAME, locale, {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
    })
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
