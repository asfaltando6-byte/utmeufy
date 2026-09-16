'use client';
import { useEffect } from 'react';
import { autoTrack } from '@/lib/tracker';
export default function Tracker(){useEffect(()=>autoTrack(),[]);return null;}
