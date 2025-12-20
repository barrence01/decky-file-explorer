#!/usr/bin/env python3
# build-plugin.py

import os
import shutil
import sys
from pathlib import Path
import zipfile
import subprocess

def run_pnpm_build(path):
    print(f"pnpm path: {path}")
    if path and path != Path('/'):
        result = subprocess.run(
            ["pnpm", "build"],
            cwd=path, 
            check=True
        )
        print("STDOUT:")
        print(result.stdout)

        print("STDERR:")
        print(result.stderr)
        if result.returncode != 0:
            raise RuntimeError("pnpm build failed")

def build_plugin():
    print("=== Plugin Build Script ===")
    
    # Get parent folder name
    current_dir = Path.cwd()
    parent_folder_name = current_dir.name
    print(f"Parent folder name: {parent_folder_name}")

    # Build deckyUI
    run_pnpm_build(current_dir)
    
    # Define zip file name
    zip_file_name = "decky-file-explorer.zip"
    zip_file_path = current_dir / zip_file_name
    
    # Remove existing zip if it exists
    if zip_file_path.exists():
        print(f"Removing existing {zip_file_name}...")
        zip_file_path.unlink()
    
    print(zip_file_path)
    print(f"Creating {zip_file_name}...")
    
    # Create zip file
    with zipfile.ZipFile(zip_file_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        
        # Files to copy
        files_to_copy = [
            "tsconfig.json",
            "README.md",
            "pnpm-lock.yaml",
            "plugin.json",
            "package.json",
            "main.py",
            "LICENSE"
        ]
        
        print("Adding required files to zip...")
        for file_name in files_to_copy:
            file_path = Path(file_name)
            if file_path.exists():
                # Add file to zip with folder structure
                zipf.write(file_path, f"{parent_folder_name}/{file_name}")
                print(f"  ✓ Added {file_name}")
            else:
                print(f"  WARNING: {file_name} not found, skipping...")
        
        # Copy directories
        directories_to_copy = ["dist", "bin", "defaults"]
        
        for dir_name in directories_to_copy:
            dir_path = Path(dir_name)
            if dir_path.exists() and dir_path.is_dir():
                print(f"Adding {dir_name} directory to zip...")
                # Walk through directory and add all files
                for file_path in dir_path.rglob('*'):
                    if file_path.is_file():
                        # Create proper path in zip
                        arcname = f"{parent_folder_name}/{file_path.relative_to('.')}"
                        zipf.write(file_path, arcname)
                print(f"  ✓ {dir_name} added")
            else:
                print(f"  WARNING: {dir_name} directory not found")
    
    # Calculate file count and size
    file_count = 0
    total_size = 0
    
    with zipfile.ZipFile(zip_file_path, 'r') as zipf:
        file_count = len(zipf.namelist())
        total_size = sum(z.file_size for z in zipf.infolist()) # type: ignore
    
    # Create summary
    print("\n=== Build Summary ===")
    print(f"Created package: {zip_file_path}")
    print(f"\nZip file size: {zip_file_path.stat().st_size / 1024:.2f} KB")
    print(f"Total files in zip: {file_count}")
    print(f"Total uncompressed size: {total_size / 1024:.2f} KB")
    
    # List contents
    print("\nTop-level contents:")
    with zipfile.ZipFile(zip_file_path, 'r') as zipf:
        # Get unique top-level folders/files
        contents = set()
        for name in zipf.namelist():
            first_part = name.split('/')[0]
            if '/' in name:
                contents.add(f"{first_part}/")
            else:
                contents.add(first_part)
        
        for item in sorted(contents):
            print(f"  {item}")
    
    print("\nBuild completed successfully!")
    print(f"\nYour plugin is ready at: {zip_file_path}")

if __name__ == "__main__":
    try:
        build_plugin()
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)