from django.utils.deprecation import MiddlewareMixin

class AllowIframeForMediaMiddleware(MiddlewareMixin):
    def process_response(self, request, response):
        if request.path.startswith('/media/'):
            response['X-Frame-Options'] = 'ALLOWALL'
        return response