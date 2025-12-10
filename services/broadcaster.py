from queue import Queue
import threading

# Global list of connected clients
connected_listeners = []
# LOCK FOR SAFETY (new)
listeners_lock = threading.Lock()

def broadcast_data(data):
    """
    Send data to all connected clients in a thread-safe way.
    """
    # Use lock to safely copy the list
    with listeners_lock:
        # Make a shallow copy of the current list [:] to iterate over
        # This prevents "list changed size during iteration" errors
        active_queues = connected_listeners[:]

    for q in active_queues:
        try:
            # put_nowait avoids blocking if the queue is full
            q.put_nowait(data)
        except Exception:
            # If a queue fails (full or closed), ignore it for now
            pass

def register_client():
    """Register a new client and return its queue."""
    q = Queue()
    with listeners_lock:
        connected_listeners.append(q)
    return q

def remove_client(q):
    """Safely remove a client queue."""
    with listeners_lock:
        if q in connected_listeners:
            connected_listeners.remove(q)