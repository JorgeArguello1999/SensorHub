from flask import Blueprint

api_routes = Blueprint('api', __name__, url_prefix='/api')

@api_routes.route('/')
def home():
    return 'h'