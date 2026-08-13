FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY cafe/ /usr/share/nginx/html/cafe/
COPY software/ /usr/share/nginx/html/software/