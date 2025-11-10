-- Fix RLS policies for services and categories to allow public access
-- This allows unauthenticated users to view services on the main website

-- Drop existing restrictive policies for service_categories
DROP POLICY IF EXISTS "Authenticated users can view categories" ON service_categories;

-- Create new public read policy for service_categories
CREATE POLICY "Anyone can view service categories"
ON service_categories
FOR SELECT
USING (true);

-- Drop existing restrictive policies for services
DROP POLICY IF EXISTS "Authenticated users can view services" ON services;

-- Create new public read policy for services
CREATE POLICY "Anyone can view services"
ON services
FOR SELECT
USING (true);