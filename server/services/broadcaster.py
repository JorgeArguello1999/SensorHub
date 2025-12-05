from queue import Queue
import threading

# Lista global de clientes
connected_listeners = []
# CANDADO DE SEGURIDAD (Nuevo)
listeners_lock = threading.Lock()

def broadcast_data(data):
    """
    Envía datos a todos los clientes de forma segura.
    """
    # Usamos el candado para hacer una copia segura de la lista
    with listeners_lock:
        # Creamos una copia de la lista actual [:] para iterar
        # Esto evita el error "list changed size during iteration"
        active_queues = connected_listeners[:]

    for q in active_queues:
        try:
            # put_nowait evita bloquearse si la cola está llena
            q.put_nowait(data)
        except Exception:
            # Si una cola falla (llena o cerrada), la marcamos para limpieza
            pass

def register_client():
    """Registra un nuevo cliente."""
    q = Queue()
    with listeners_lock:
        connected_listeners.append(q)
    return q

def remove_client(q):
    """Elimina un cliente de forma segura."""
    with listeners_lock:
        if q in connected_listeners:
            connected_listeners.remove(q)