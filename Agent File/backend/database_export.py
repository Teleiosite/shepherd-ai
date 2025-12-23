#!/usr/bin/env python3
"""
Shepherd AI - Database Export Script for Render PostgreSQL
Exports database to SQL file for migration to Oracle or other platforms
"""

import subprocess
import os
from datetime import datetime
from urllib.parse import urlparse

def export_database():
    """Export Render PostgreSQL database to SQL file"""
    
    print("🗄️  Shepherd AI - Database Export Tool")
    print("=" * 50)
    
    # Get database URL from environment or user input
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("\n📝 Please provide your Render Database URL")
        print("(Found in Render Dashboard → Database → Connect → External Connection)")
        database_url = input("\nDatabase URL: ").strip()
    
    # Parse database URL
    parsed = urlparse(database_url)
    
    print(f"\n✅ Database: {parsed.hostname}")
    print(f"✅ Port: {parsed.port or 5432}")
    print(f"✅ Database Name: {parsed.path[1:]}")
    
    # Generate filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"shepherd_ai_backup_{timestamp}.sql"
    
    print(f"\n📦 Exporting to: {filename}")
    print("⏳ This may take a few minutes...")
    
    # Run pg_dump
    try:
        subprocess.run([
            'pg_dump',
            database_url,
            '-f', filename,
            '--no-owner',     # Don't output commands to set ownership
            '--no-privileges', # Don't output privilege commands
            '-clean',         # Clean (drop) database objects before recreating
            '--if-exists'     # Use IF EXISTS when dropping objects
        ], check=True)
        
        # Get file size
        file_size = os.path.getsize(filename) / (1024 * 1024)  # MB
        
        print(f"\n✅ Export successful!")
        print(f"📄 File: {filename}")
        print(f"📊 Size: {file_size:.2f} MB")
        print(f"\n💡 To import this to another PostgreSQL database:")
        print(f"   psql [new-database-url] < {filename}")
        
return True
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Export failed: {e}")
        print("\n💡 Troubleshooting:")
        print("1. Ensure pg_dump is installed:")
        print("   - Windows: https://www.postgresql.org/download/windows/")
        print("   - Mac: brew install postgresql")
        print("   - Linux: sudo apt-get install postgresql-client")
        print("\n2. Verify DATABASE_URL is correct")
        print("3. Check network connection to Render")
        return False
    
    except FileNotFoundError:
        print("\n❌ pg_dump not found!")
        print("\n📥 Install PostgreSQL client tools:")
        print("   - Windows: https://www.postgresql.org/download/windows/")
        print("   - Mac: brew install postgresql")
        print("   - Linux: sudo apt-get install postgresql-client")
        return False

if __name__ == "__main__":
    export_database()
