.PHONY: list
list:
	@LC_ALL=C $(MAKE) -pRrq -f $(firstword $(MAKEFILE_LIST)) : 2>/dev/null | awk -v RS= -F: '/(^|\n)# Files(\n|$$)/,/(^|\n)# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | grep -E -v -e '^[^[:alnum:]]' -e '^$@$$'
# IMPORTANT: The line above must be indented by (at least one) 
#            *actual TAB character* - *spaces* do *not* work.

COMPOSE_FILES=-f docker-compose.yml -f docker-compose.config.yml
COMPOSE=docker compose $(COMPOSE_FILES)

.PHONY: run stop debug

run:
	$(COMPOSE) up -d --build

stop:
	$(COMPOSE) down --remove-orphans

debug:
	$(COMPOSE) up -d --scale api=0 mongodb jaeger prometheus swagger-ui nginx
