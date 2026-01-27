/**
 * Guahh - Search UI Logic
 */
(function () {
    const input = document.getElementById('input');
    const form = document.getElementById('form');
    const container = document.getElementById('results-container');

    // Math Evaluation
    function evaluateMath(expression) {
        try {
            // Basic cleaning
            const cleanExpr = expression
                .replace(/times/gi, '*')
                .replace(/plus/gi, '+')
                .replace(/minus/gi, '-')
                .replace(/divided by/gi, '/')
                .replace(/x/gi, '*') // common multiplier x
                .replace(/[^0-9+\-*/.()^%]/g, ''); // Allow basic math chars

            // Use Math.js if available, else fallback to Function
            if (window.math) {
                return window.math.evaluate(cleanExpr);
            } else {
                return Function('"use strict"; return (' + cleanExpr + ')')();
            }
        } catch (e) {
            return null;
        }
    }

    async function process(text) {
        const cmd = text.toLowerCase();

        // 1. Math Calculation (Auto-detect math expressions)
        // Check for patterns like "5+5", "10 * 2", "what is 5+5", or just numbers with operators
        const mathPattern = /(?:what(?:'s| is)?\s*)?([\d.]+\s*[\+\-\*\/\^%]\s*[\d.]+(?:\s*[\+\-\*\/\^%]\s*[\d.]+)*)/i;
        const mathMatch = cmd.match(mathPattern);
        if (mathMatch || /calculate|plus|minus|times|divide/.test(cmd)) {
            const result = evaluateMath(mathMatch ? mathMatch[1] : cmd);
            if (result !== null && !isNaN(result)) {
                return {
                    type: 'math',
                    title: 'Calculation',
                    main: result,
                    sub: mathMatch ? mathMatch[1] : text
                };
            }
        }

        // 2. Time
        if (cmd.includes('time')) {
            const d = new Date();
            const time = `${d.getHours() % 12 || 12}:${d.getMinutes().toString().padStart(2, '0')} ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
            return {
                type: 'time',
                title: 'Current Time',
                main: time,
                sub: new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
            };
        }

        // 3. Weather (Smarter) - handles "weather in X", "what's the weather in X", etc.
        const weatherMatch = cmd.match(/(?:what'?s?\s+the\s+)?weather\s*(?:in|for|at)?\s*(.+)?/i);
        if (cmd.includes('weather')) {
            try {
                let lat, lon, locationName;

                // Check if a location is specified
                if (weatherMatch && weatherMatch[1]) {
                    const query = weatherMatch[1].replace(/\?+$/, '').replace('tomorrow', '').trim();
                    if (query) {
                        try {
                            const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`).then(r => r.json());
                            if (geo.results && geo.results.length > 0) {
                                lat = geo.results[0].latitude;
                                lon = geo.results[0].longitude;
                                locationName = `${geo.results[0].name}, ${geo.results[0].country}`;
                            }
                        } catch (e) { console.error('Geo fetch error', e); }
                    }
                }

                // Fallback to IP location
                if (!lat || !lon) {
                    const ip = await fetch('https://ipapi.co/json/').then(r => r.json());
                    lat = ip.latitude;
                    lon = ip.longitude;
                    locationName = ip.city || 'Your Location';
                }

                const w = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`).then(r => r.json());
                const codes = { 0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 61: 'Rain', 71: 'Snow', 95: 'Thunderstorm' };

                return {
                    type: 'weather',
                    title: `Weather in ${locationName}`,
                    main: `${Math.round(w.current.temperature_2m)}°C`,
                    sub: codes[w.current.weather_code] || 'Unknown conditions'
                };
            } catch (e) {
                return { type: 'error', title: 'Error', main: "Couldn't retrieve weather." };
            }
        }

        // 4. Joke
        if (cmd.includes('joke')) {
            try {
                const j = await fetch('https://v2.jokeapi.dev/joke/Any?safe-mode&type=single,twopart').then(r => r.json());
                const jokeText = j.type === 'single' ? j.joke : `${j.setup}\n\n${j.delivery}`;
                return {
                    type: 'joke',
                    title: 'Random Joke',
                    main: jokeText,
                    sub: 'JokeAPI'
                };
            } catch {
                return { type: 'text', title: 'Joke', main: 'Why did the chicken cross the road? To get to the other side.' };
            }
        }

        // 5. Coin Flip
        if (cmd.includes('flip') || (cmd.includes('coin'))) {
            const res = Math.random() < 0.5 ? 'Heads' : 'Tails';
            return { type: 'choice', title: 'Coin Flip', main: res };
        }

        // 6. Roll Dice
        if (cmd.includes('roll') || (cmd.includes('dice'))) {
            const res = Math.floor(Math.random() * 6) + 1;
            return { type: 'choice', title: 'Dice Roll', main: res };
        }

        // 7. Random Fact
        if (cmd.includes('fact')) {
            const facts = [
                "Honey never spoils.",
                "Octopuses have three hearts.",
                "Bananas are berries, but strawberries aren't.",
                "The Eiffel Tower can be 15 cm taller during the summer.",
                "A group of flamingos is called a 'flamboyance'.",
                "Wombat poop is cube-shaped.",
                "The shortest war in history lasted 38 minutes."
            ];
            return {
                type: 'text',
                title: 'Did you know?',
                main: facts[Math.floor(Math.random() * facts.length)]
            };
        }

        // 8. Clear
        if (cmd === 'clear' || cmd.includes('clear screen')) {
            return null;
        }

        // 9. Generic/Greetings
        if (cmd.match(/^(hi|hello|hey)/)) return { type: 'text', title: 'Greeting', main: 'Hello there!', sub: 'How can I help you today?' };

        // 10. About Me / Capabilities
        if (cmd.includes('what are you') || cmd.includes('who are you')) {
            return {
                type: 'text',
                title: 'About Me',
                main: "I'm Guahh Assistant, your personal AI helper.",
                sub: "I can help with calculations, weather, jokes, facts, and general knowledge."
            };
        }
        if (cmd.includes('what can you do') || cmd.includes('help') || cmd.includes('capabilities')) {
            return {
                type: 'text',
                title: 'My Capabilities',
                main: "I can answer questions, calculate math, fetch weather, tell jokes, and share interesting facts.",
                sub: "Try: 'Weather in Tokyo', '5+5', 'Who is Einstein?'"
            };
        }
        if (cmd.includes('your name')) {
            return { type: 'text', title: 'My Name', main: 'I am Guahh Assistant!' };
        }
        if (cmd.includes('how are you')) {
            return { type: 'text', title: 'Status', main: "I'm doing great, thanks for asking!", sub: 'Ready to assist you.' };
        }
        if (cmd.includes('thank')) {
            return { type: 'text', title: 'You\'re Welcome', main: "Happy to help!" };
        }

        // 11. Wikipedia Fallback (Knowledge with Images)
        // This handles "what is X", "who is X", or just "X"
        try {
            // Strip common question prefixes to get the topic
            let cleanQuery = text
                .replace(/^(what is|what's|who is|who's|tell me about|define|what are|who are|where is|when was|how is)\s*/gi, '')
                .replace(/\?+$/, '') // remove trailing question marks
                .trim();

            if (cleanQuery.length > 2) {
                const wikiURL = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanQuery)}`;
                const response = await fetch(wikiURL);
                if (response.ok) {
                    const data = await response.json();
                    if (data.type === 'standard' && data.extract) {
                        // Collect images
                        const images = [];
                        if (data.thumbnail && data.thumbnail.source) {
                            images.push(data.originalimage ? data.originalimage.source : data.thumbnail.source);
                        }
                        return {
                            type: 'knowledge',
                            title: data.title,
                            main: data.extract,
                            sub: 'Source: Wikipedia',
                            images: images
                        };
                    }
                }
            }
        } catch (e) {
            // silent fail
        }

        // Default text fallback
        return {
            type: 'text',
            title: 'Guahh Assistant',
            main: "I'm not sure about that one.",
            sub: "Try asking about time, weather, math, or jokes."
        };
    }

    function createPanel(data) {
        const panel = document.createElement('div');
        panel.className = `panel ${data.type}`;

        panel.innerHTML = `
            <div class="panel-header">${data.title}</div>
            <div class="panel-content">${data.main}</div>
            ${data.sub ? `<div class="panel-sub">${data.sub}</div>` : ''}
        `;

        return panel;
    }

    function createImagePanel(imageSrc) {
        const img = document.createElement('img');
        img.src = imageSrc;
        img.alt = '';
        img.className = 'result-image';
        return img;
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;

        container.innerHTML = '';

        const resultData = await process(text);

        if (resultData) {
            const panel = createPanel(resultData);
            container.appendChild(panel);

            // If there are images, create separate image panels
            if (resultData.images && resultData.images.length > 0) {
                resultData.images.forEach(src => {
                    const imgPanel = createImagePanel(src);
                    container.appendChild(imgPanel);
                });
            }
        }
    }

    form.addEventListener('submit', handleSubmit);

    // Action Chips
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const cmd = chip.dataset.cmd;
            input.value = cmd;
            // Manually trigger submit
            form.dispatchEvent(new Event('submit'));
        });
    });

    // Focus input on load
    input.focus();
})();
