import os
import sys

# Add the current directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

try:
    from AA_Server_API import run_server
    print("Successfully imported run_server")
except ImportError as e:
    print(f"Import error: {e}")
    sys.exit(1)

if __name__ == '__main__':
    print("Starting Attribute Authority server...")
    try:
        run_server(host='0.0.0.0', port=5001)
    except Exception as e:
        print(f"Error running server: {e}")
        import traceback
        traceback.print_exc()