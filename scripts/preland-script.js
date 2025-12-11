window.addEventListener('DOMContentLoaded', () => {
    const links = document.querySelectorAll('a');
    const domain = window.location.hostname;
    links.forEach(link => {
        link.href = link.href.replace('https:///', 'https://' + domain + '/');
    });
});

window.addEventListener("DOMContentLoaded", function() {
    let maxScroll = 0;
    window.addEventListener("scroll", function() {
        let scrollTop = window.scrollY;
        let windowHeight = window.innerHeight;
        let documentHeight = document.documentElement.scrollHeight;
        let scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;
        if (scrollPercent > maxScroll) {
            maxScroll = scrollPercent;
        }
    });

    let links = document.querySelectorAll("a");
    let url = links[0].href;
    links.forEach(function(link) {
        link.addEventListener("click", function(event) {
            event.preventDefault();
            url += (url.includes("?") ? "&" : "?") + "scroll=" + Math.round(maxScroll);
            window.location.href = url;
        });
    });
});