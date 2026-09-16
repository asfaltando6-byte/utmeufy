import { NextRequest, NextResponse } from 'next/server';
export function middleware(req:NextRequest){const expected=process.env.DASHBOARD_SESSION_TOKEN;if(!expected)return NextResponse.redirect(new URL('/login?error=config',req.url));const session=req.cookies.get('otr_admin')?.value;if(session===expected)return NextResponse.next();const login=new URL('/login',req.url);login.searchParams.set('next',req.nextUrl.pathname);return NextResponse.redirect(login)}
export const config={matcher:['/dashboard/:path*']};
