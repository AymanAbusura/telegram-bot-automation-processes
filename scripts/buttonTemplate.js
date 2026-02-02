function getButtonHtml(markerText) {
    return `
<!-- BUTTON -->
<style>
    .button_linking_a {
        text-decoration: none!important;
    }

    .button_linking {
        background-color: rgb(216, 7, 7);
        color: white;
        text-align: center;
        border-radius: 10px;
        font-size: 28px;
        line-height: 40px;
        padding-top: 10px;
        padding-bottom: 10px;
        width: 80%;
        margin: 40px auto;
        text-transform: uppercase;
    }
    .button_linking:hover { cursor: pointer; background-color: rgb(242, 25, 25); }
</style>

<a href="{offer}" class="button_linking_a">
    <div class="button_linking">${markerText}</div>
</a>
<!-- END BUTTON -->
`;
}

module.exports = getButtonHtml;