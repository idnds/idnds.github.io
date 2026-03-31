// docs/.vitepress/theme/index.js
import DefaultTheme from 'vitepress/theme';
import './custom.css';
import "./badges.css";

import EventCard from './components/EventCard.vue';
import EventFilter from './components/EventFilter.vue';
import EventStatusBadge from "./components/EventStatusBadge.vue";
import EventDetailBadges from "./components/EventDetailBadges.vue";
import EventCreateForm from "./components/EventCreateForm.vue";
import PagefindSearch from './components/PagefindSearch.vue'

export default {
    ...DefaultTheme,
    enhanceApp({ app }) {
        app.component('EventCard', EventCard)
        app.component('EventFilter', EventFilter)
        app.component("EventStatusBadge", EventStatusBadge);
        app.component("EventDetailBadges", EventDetailBadges);
        app.component("EventCreateForm", EventCreateForm);
        app.component('PagefindSearch', PagefindSearch)
    },
}