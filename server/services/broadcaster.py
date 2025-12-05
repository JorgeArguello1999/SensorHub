from queue import Queue

# Lista global de clientes conectados a la web
connected_listeners = []

def broadcast_data(data):
    """
    Envía datos a todos los navegadores conectados.
    Esto ocurre en MEMORIA, no gasta lecturas de base de datos.
    """
    # Enviamos a cada cliente conectado
    for q in connected_listeners:
        try:
            q.put(data)
        except Exception:
            pass # Si una cola falla, la ignoramos

def register_client():
    """Registra un nuevo navegador y devuelve su cola de mensajes."""
    q = Queue()
    connected_listeners.append(q)
    return q

def remove_client(q):
    """Elimina un navegador desconectado de la lista."""
    if q in connected_listeners:
        connected_listeners.remove(q)