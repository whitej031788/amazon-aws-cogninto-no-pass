// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { CognitoUserPoolTriggerHandler } from 'aws-lambda';
import { randomDigits } from 'crypto-secure-random-digit';
import { SES } from 'aws-sdk';

const ses = new SES();

export const handler: CognitoUserPoolTriggerHandler = async event => {

    let secretLoginCode: string;
    if (!event.request.session || !event.request.session.length) {

        // This is a new auth session
        // Generate a new secret login code and mail it to the user
        secretLoginCode = randomDigits(6).join('');
        await sendEmail(event.request.userAttributes.email, secretLoginCode);

    } else {

        // There's an existing session. Don't generate new digits but
        // re-use the code from the current session. This allows the user to
        // make a mistake when keying in the code and to then retry, rather
        // the needing to e-mail the user an all new code again.    
        const previousChallenge = event.request.session.slice(-1)[0];
        secretLoginCode = previousChallenge.challengeMetadata!.match(/CODE-(\d*)/)![1];
    }

    // This is sent back to the client app
    event.response.publicChallengeParameters = { email: event.request.userAttributes.email };

    // Add the secret login code to the private challenge parameters
    // so it can be verified by the "Verify Auth Challenge Response" trigger
    event.response.privateChallengeParameters = { secretLoginCode };

    // Add the secret login code to the session so it is available
    // in a next invocation of the "Create Auth Challenge" trigger
    event.response.challengeMetadata = `CODE-${secretLoginCode}`;

    return event;
};

async function sendEmail(emailAddress: string, secretLoginCode: string) {
    const params: SES.SendEmailRequest = {
        Destination: { ToAddresses: [emailAddress] },
        Message: {
            Body: {
                Html: {
                    Charset: 'UTF-8',
                    Data: `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd"><html>
                    <head> <meta charset="UTF-8"> <meta content="width=device-width, initial-scale=1" name="viewport"> <meta name="x-apple-disable-message-reformatting"> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <meta content="telephone=no" name="format-detection"> <title></title> <!--[if (mso 16)]> <style type="text/css"> a {text-decoration: none;} </style> <![endif]--> <!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]--> </head><body> <div class="es-wrapper-color"> <!--[if gte mso 9]> <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t"> <v:fill type="tile" color="#fafafa"></v:fill> </v:background> <![endif]--> <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0"> <tbody> <tr> <td class="esd-email-paddings" valign="top">  <table class="es-content esd-footer-popover" cellspacing="0" cellpadding="0" align="center"> <tbody> <tr> <td class="esd-stripe" style="background-color: rgb(250, 250, 250);" bgcolor="#fafafa" align="center"> <table class="es-content-body" style="background-color: rgb(255, 255, 255);" width="600" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center"> <tbody> <tr> <td class="esd-structure es-p40t es-p20r es-p20l" style="background-color: transparent; background-position: left top;" bgcolor="transparent" align="left"> <table width="100%" cellspacing="0" cellpadding="0"> <tbody> <tr> <td class="esd-container-frame" width="560" valign="top" align="center"> <table style="background-position: left top;" width="100%" cellspacing="0" cellpadding="0"> <tbody> <tr> <td class="esd-block-image es-p5t es-p5b" align="center"><a target="_blank"><img src="https://tlr.stripocdn.email/content/guids/CABINET_dd354a98a803b60e2f0411e893c82f56/images/23891556799905703.png" alt style="display: block;" width="175"></a></td> </tr> <tr> <td class="esd-block-text es-p15t es-p15b" align="center"> <h1 style="color: #333333; font-size: 20px;"><b>YOUR SECRET LOGIN CODE</b></h1> </td> </tr> <tr> <td class="esd-block-text es-p40r es-p40l" align="center"> <p>Hi there! It looks like there was a request to login. Please use the secret login code below on the sign in page to continue:</p> </td> </tr> <tr> <td class="esd-block-text es-p15t es-p15b" align="center"> <h1 style="color: #333333; font-size: 20px;"><b>${secretLoginCode}</b></h1> </td> </tr> <tr> <td class="esd-block-text es-p25t es-p40r es-p40l" align="center"> <p>If you did not make this request, just ignore this email.&nbsp;</p> </td> </tr> </tbody> </table> </td> </tr> </tbody> </table> </td> </tr> </tbody> </table> </td> </tr> </tbody> </table> </td> </tr> </tbody> </table> </div> </body></html>`
                },
                Text: {
                    Charset: 'UTF-8',
                    Data: `Your secret login code: ${secretLoginCode}`
                }
            },
            Subject: {
                Charset: 'UTF-8',
                Data: 'Your secret login code'
            }
        },
        Source: process.env.SES_FROM_ADDRESS!
    };
    await ses.sendEmail(params).promise();
}
