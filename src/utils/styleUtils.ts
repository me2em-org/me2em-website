export type PaddingSize = 'small' | 'base' | 'large';
export type ThemeColor = 'base' | 'light' | 'dark';

interface PaddingOptions {
    padding?: PaddingSize;
    paddingTop?: PaddingSize;
    paddingBottom?: PaddingSize;
}

export const getPaddingClass = ({ padding, paddingTop, paddingBottom }: PaddingOptions): string => {
    if (padding) return `py-${padding}`;
    
    const classes = [];
    if (paddingTop) classes.push(`pt-${paddingTop}`);
    if (paddingBottom) classes.push(`pb-${paddingBottom}`);
    return classes.join(' ');
};

export const getBackgroundColor = (background: ThemeColor = 'base'): string => {
    const bgColors = {
        base: 'bg-background-base',
        light: 'bg-background-light',
        dark: 'bg-background-dark'
    };
    return bgColors[background];
};

export const getTextColor = (background: ThemeColor = 'base'): string => {
    const textColors = {
        base: 'text-body-base',
        light: 'text-body-light',
        dark: 'text-body-dark'
    };
    return textColors[background];
};

export const getHeadlineColor = (background: ThemeColor = 'base'): string => {
    const headlineColors = {
        base: 'text-headline',
        light: 'text-headline-light',
        dark: 'text-headline-dark'
    };
    return headlineColors[background];
};

export const getEyebrowColor = (background: ThemeColor = 'base'): string => {
    const eyebrowColors = {
        base: 'text-eyebrow',
        light: 'text-eyebrow-light',
        dark: 'text-eyebrow-dark'
    };
    return eyebrowColors[background];
};

export const getInputBackgroundColor = (background: ThemeColor = 'base'): string => {
    const inputBgColors = {
        base: 'bg-input',
        light: 'bg-input-light',
        dark: 'bg-input-dark'
    };
    return inputBgColors[background];
};

export const getInputTextColor = (background: ThemeColor = 'base'): string => {
    const inputTextColors = {
        base: 'text-input-text',
        light: 'text-input-text-light',
        dark: 'text-input-text-dark'
    };
    return inputTextColors[background];
}; 