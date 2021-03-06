/* Magic Mirror
 * Module: MMM-WienerLinien
 *
 * By fewieden https://github.com/fewieden/MMM-WienerLinien
 * MIT Licensed.
 */

/* global Module Log moment config */

Module.register('MMM-WienerLinien', {

    index: 0,

    types: {
        ptBusCity: 'fa-bus',
        ptTram: 'fa-train',
        ptTramWLB: 'fa-train',
        ptMetro: 'fa-subway'
    },

    defaults: {
        max: 5,
        shortenStation: false,
        shortenDestination: false,
        rotateInterval: 20 * 1000,
        updateInterval: 5 * 60 * 1000,
        elevatorStations: [],
        incidentLines: [],
        incidentShort: false
    },

    getTranslations() {
        return {
            en: 'translations/en.json',
            de: 'translations/de.json'
        };
    },

    getScripts() {
        return ['moment.js'];
    },

    getStyles() {
        return ['font-awesome.css', 'MMM-WienerLinien.css'];
    },

    start() {
        Log.info(`Starting module: ${this.name}`);
        moment.locale(config.language);
        this.maxIndex = this.config.stations.length;
        setInterval(function() {
            this.updateDom(300);
            this.index += 1;
            if (this.index >= this.maxIndex) {
                this.index = 0;
            }
        }, this.config.rotateInterval);
        this.sendSocketNotification('CONFIG', this.config);
    },

    socketNotificationReceived(notification, payload) {
        if (notification === 'STATIONS') {
            this.stations = payload;
        } else if (notification === 'ELEVATORS') {
            this.elevators = payload;
        } else if (notification === 'INCIDENTS') {
            this.incidents = payload;
        }
        this.updateDom(300);
    },

    getDom() {
        const wrapper = document.createElement('div');
        const header = document.createElement('header');
        header.classList.add('align-left');
        const logo = document.createElement('i');
        logo.classList.add('fa', 'fa-bus', 'logo');
        header.appendChild(logo);
        const name = document.createElement('span');
        name.innerHTML = 'WienerLinien';
        header.appendChild(name);
        wrapper.appendChild(header);

        if (!this.stations) {
            const text = document.createElement('div');
            text.innerHTML = this.translate('LOADING');
            text.classList.add('dimmed', 'light');
            wrapper.appendChild(text);
        } else {
            const keys = Object.keys(this.stations);
            this.maxIndex = keys.length;
            if (this.index >= this.maxIndex) {
                this.index = 0;
            }

            const station = document.createElement('div');
            station.classList.add('align-left');
            station.innerHTML = this.shortenText(this.stations[keys[this.index]].name, this.config.shortenStation);
            wrapper.appendChild(station);
            const table = document.createElement('table');
            table.classList.add('small', 'table', 'align-left');

            table.appendChild(this.createLabelRow());

            for (var i = 0; i < Math.min(this.stations[keys[this.index]].departures.length, this.config.max); i += 1) {
                this.appendDataRow(this.stations[keys[this.index]].departures[i], table);
            }

            wrapper.appendChild(table);
        }

        // Create section for line and elevator incidents
        const incidentSection = document.createElement('div');
        const incidentTitle = document.createElement('div');
        incidentTitle.classList.add('align-left', 'small', 'incidents');
        const incidentList = document.createElement('table');
        incidentList.classList.add('align-left', 'table', 'xsmall');

        if ((this.incidents && this.incidents.length > 0) || (this.elevators && this.elevators.length > 0)) {
            incidentTitle.innerHTML = this.translate('INCIDENTS');
            // Elevator disruption info
            if (this.elevators && this.elevators.length > 0) {
                this.appendIncidentData(incidentList, 'elevators');
            }

            // Line incident info
            if (this.incidents && this.incidents.length > 0) {
                this.appendIncidentData(incidentList, 'incidents');
            }
            incidentSection.appendChild(incidentList);
        } else {
            incidentTitle.innerHTML = this.translate('NO_INCIDENTS');
        }

        incidentSection.appendChild(incidentTitle);
        incidentSection.appendChild(incidentList);
        wrapper.appendChild(incidentSection);

        return wrapper;
    },

    createLabelRow() {
        const labelRow = document.createElement('tr');

        const typeIconLabel = document.createElement('th');
        typeIconLabel.classList.add('centered');
        const typeIcon = document.createElement('i');
        typeIcon.classList.add('fa', 'fa-info');
        typeIconLabel.appendChild(typeIcon);
        labelRow.appendChild(typeIconLabel);

        const lineIconLabel = document.createElement('th');
        lineIconLabel.classList.add('centered');
        const lineIcon = document.createElement('i');
        lineIcon.classList.add('fa', 'fa-tag');
        lineIconLabel.appendChild(lineIcon);
        labelRow.appendChild(lineIconLabel);

        const directionIconLabel = document.createElement('th');
        directionIconLabel.classList.add('centered');
        const directionIcon = document.createElement('i');
        directionIcon.classList.add('fa', 'fa-compass');
        directionIconLabel.appendChild(directionIcon);
        labelRow.appendChild(directionIconLabel);

        const timeIconLabel = document.createElement('th');
        timeIconLabel.classList.add('centered');
        const timeIcon = document.createElement('i');
        timeIcon.classList.add('fa', 'fa-clock-o');
        timeIconLabel.appendChild(timeIcon);
        labelRow.appendChild(timeIconLabel);

        return labelRow;
    },

    appendDataRow(data, appendTo) {
        const row = document.createElement('tr');

        const type = document.createElement('td');
        type.classList.add('centered');
        const typeIcon = document.createElement('i');
        typeIcon.classList.add('fa', Object.prototype.hasOwnProperty.call(this.types, data.type) ? this.types[data.type] : 'fa-question');
        type.appendChild(typeIcon);
        row.appendChild(type);

        const line = document.createElement('td');
        line.classList.add('centered');
        line.innerHTML = data.line;
        if(data.barrierFree) {
		const icon = document.createElement('i');
		icon.classList.add('fa','fa-wheelchair');
		line.append(icon);
	}
        row.appendChild(line);

        const towards = document.createElement('td');
        towards.innerHTML = this.shortenText(data.towards, this.config.shortenDestination);
        row.appendChild(towards);

        const time = document.createElement('td');
        time.classList.add('align-left');
        time.innerHTML = moment().to(data.time);
        row.appendChild(time);

        appendTo.appendChild(row);
    },

    appendIncidentData(appendTo, type) {
        for (var i = 0; i < this[type].length; i += 1) {
            const row = document.createElement('tr');

            const typeColumn = document.createElement('td');
            typeColumn.classList.add('centered');
            if (type === 'elevators') {
                const typeIcon = document.createElement('i');
                typeIcon.classList.add('fa', 'fa-wheelchair');
                typeColumn.appendChild(typeIcon);
            } else {
                typeColumn.innerHTML = this[type][i].lines;
            }
            row.appendChild(typeColumn);

            const description = document.createElement('td');
            description.classList.add('align-left');
            if (type === 'elevators') {
                description.innerHTML = this[type][i];
            } else {
                description.innerHTML = this[type][i].description;
            }
            row.appendChild(description);

            appendTo.appendChild(row);
        }
    },

    shortenText(text, option) {
        var temp = text;

        if (option && temp.length > option) {
            temp = `${temp.slice(0, option)}&#8230;`;
        }
        return temp;
    }
});
