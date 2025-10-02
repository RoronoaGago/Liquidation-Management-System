from django.utils.deprecation import MiddlewareMixin
import threading

thread_local = threading.local()


class AuditMiddleware(MiddlewareMixin):
    def process_request(self, request):
        thread_local.request = request
        return None

    def process_response(self, request, response):
        if hasattr(thread_local, 'request'):
            del thread_local.request
        return response

    def process_exception(self, request, exception):
        if hasattr(thread_local, 'request'):
            del thread_local.request
        return None


class AllowIframeForMediaMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        if request.path.startswith('/media/'):
            response['X-Frame-Options'] = 'ALLOWALL'
        return response
