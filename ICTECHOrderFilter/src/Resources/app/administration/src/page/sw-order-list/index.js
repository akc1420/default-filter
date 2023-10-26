const { Component } = Shopware;
const { Mixin } = Shopware;
const { Criteria } = Shopware.Data;

Component.override('sw-order-list', {

    inject: [
        'repositoryFactory',
        'stateStyleDataProviderService',
        'acl',
        'filterFactory',
        'feature',
        'systemConfigApiService',
        'configService'
    ],

    mixins: [
        Mixin.getByName('listing'),
    ],

    data() {
        return {
            pluginConfig: "",
            pluginConfigActive: "",
            orders: [],
            sortBy: 'orderDateTime',
            sortDirection: 'DESC',
            isLoading: false,
            filterLoading: false,
            showDeleteModal: false,
            availableAffiliateCodes: [],
            availableCampaignCodes: [],
            availablePromotionCodes: [],
            filterCriteria: [],
            defaultFilters: [
                'affiliate-code-filter',
                'campaign-code-filter',
                'promotion-code-filter',
                'document-filter',
                'order-date-filter',
                'order-value-filter',
                'status-filter',
                'payment-status-filter',
                'delivery-status-filter',
                'payment-method-filter',
                'shipping-method-filter',
                'sales-channel-filter',
                'billing-country-filter',
                'customer-group-filter',
                'shipping-country-filter',
                'customer-group-filter',
                'tag-filter',
                'line-item-filter',
            ],
            storeKey: 'grid.filter.order',
            activeFilterNumber: 0,
            showBulkEditModal: false,
            searchConfigEntity: 'order',
        };
    },
    created() {
        this.createdComponent();
    },

    methods: {
        createdComponent() {
            this.loadFilterValues()
        },
        
        async getList() {
            this.isLoading = true;
            let criteria = await Shopware.Service('filterService')
                .mergeWithStoredFilters(this.storeKey, this.orderCriteria);

            criteria = await this.addQueryScores(this.term, criteria);
            this.activeFilterNumber = criteria.filters.length;

            if (!this.entitySearchable) {
                this.isLoading = false;
                this.total = 0;
                return;
            }

            if (this.freshSearchTerm) {
                criteria.resetSorting();
            }

            // Custom Code start
            const response = this.systemConfigApiService.getValues('ICTECHOrderFilter.config');
            const inputFieldName = response['ICTECHOrderFilter.config.orderFilter'];

            await this.systemConfigApiService.getValues('ICTECHOrderFilter.config')
            .then(result => {
                this.pluginConfig = result['ICTECHOrderFilter.config.orderFilter'];
                this.pluginConfigActive = result['ICTECHOrderFilter.config.status'];
            });

            if(this.pluginConfigActive) {
                var timeframe = "";
                if (this.pluginConfig == "lastYear") {
                    var timeframe = 365
                } else if (this.pluginConfig == "lastMonth") {
                    var timeframe = 30
                } else if (this.pluginConfig == "lastWeek") {
                    var timeframe = 7
                } else if (this.pluginConfig == "lastDay") {
                    var timeframe = 1
                }

                if(this.pluginConfig == "lastQuarter"){
                    const endDate = this.getPreviousQuarterDates()['endDate'];
                    const startDate = this.getPreviousQuarterDates()['startDate'];

                    criteria.addFilter(
                        Criteria.range(
                            'orderDateTime',
                            {
                                gte: startDate.toISOString(),
                                lte: endDate.toISOString()
                            }
                        )
                    );
                }else{
                    const endDate = new Date();
                    const startDate = new Date(endDate);
                    startDate.setDate(endDate.getDate() - timeframe);

                    criteria.addFilter(
                        Criteria.range(
                            'orderDateTime',
                            {
                                gte: startDate.toISOString(),
                                lte: endDate.toISOString()
                            }
                        )
                    );
                }
            }
            //Custom code end

            try {
                const response = await this.orderRepository.search(criteria);

                this.total = response.total;
                this.orders = response;
                this.isLoading = false;
            } catch {
                this.isLoading = false;
            }
        },

        getPreviousQuarterDates() {
            const date = new Date();
            const quarter = Math.floor((date.getMonth() / 3));

            const startDate = new Date(date.getFullYear(), quarter * 3 - 3, 1);
            const endDate = new Date(
                date.getFullYear(),
                startDate.getMonth() + 3,
                0,
                23,
                59,
                59,
            );

            return {
                startDate: startDate,
                endDate: endDate,
            };
        },
    }
});
