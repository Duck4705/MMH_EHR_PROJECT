import sys
import os

# Add parent directory to path so we can import ABE_Module
parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import from ABE_Module.py
from ABE_Module import ABECore

# Re-export the ABECore class
__all__ = ['ABECore']