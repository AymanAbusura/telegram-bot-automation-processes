module.exports = `

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="../jquery-migration-3.7.1.min.js"></script>
<link rel="stylesheet" href="intlTelInput.css">
<style type="text/css">
    @keyframes rf-spin {
        100% { transform: rotate(360deg); }
    }
    .rf-form__loader {
        position: absolute;
        z-index: 999;
        top: 0;
        left: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        width: 100%;
        height: 100%;
        border-radius: inherit;
        background: rgba(255, 255, 255, 0.8);
    }
    .rf-form__loader::before {
        content: '';
        display: block;
        width: 46px;
        height: 46px;
        margin-bottom: 16px;
        border-radius: 50%;
        border: 5px solid #fff;
        border-color: currentColor transparent currentColor transparent;
        animation: rf-spin 1.2s linear infinite;
    }
</style>
<style>
    input.failed-input,
    .f1t-form-field__input.failed-input,
    .iti input.failed-input {
        border: 3px solid red !important;
    }
    input.failed-input:focus,
    .f1t-form-field__input.failed-input:focus,
    .iti input.failed-input:focus {
        border-color: red !important;
        box-shadow: none !important;
    }
    input.valid-input { 
        border: 3px solid #28a745 !important; 
    }
    form button[type="submit"]:disabled, form input[type="submit"]:disabled {
        opacity: 0.6;
        cursor: not-allowed!important;
    }
    .input_error {
        width: 100%;
        padding: 10px;
        font-weight: 400;
        margin-top: 0.25rem;
        color: #fff;
        background-color: #eb162b;
        font-size: 12px;
        display: none;
        border: 3px solid rgb(235, 22, 43);
        box-sizing: border-box;
    }
</style>
`;