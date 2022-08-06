import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Button,
  Image,
  ImageBackground,
  ActivityIndicator,
  useWindowDimensions,
  PermissionsAndroid,
  Platform,
  Text,
  Dimensions,
  Pressable,
} from 'react-native';

import ViewShot, { captureScreen } from 'react-native-view-shot';
import RNFS from 'react-native-fs';
import Carousel from 'react-native-snap-carousel';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faLock, faAirFreshener, faAnchor, faCircleArrowRight } from '@fortawesome/free-solid-svg-icons';
import { faAdobe, faApple, faMicrosoft } from '@fortawesome/free-brands-svg-icons';

import Video, { LoadError, OnLoadData } from 'react-native-video';
import { SAFE_AREA_PADDING } from './Constants';
import { useIsForeground } from './hooks/useIsForeground';
import { PressableOpacity } from 'react-native-pressable-opacity';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { Alert } from 'react-native';
import CameraRoll from '@react-native-community/cameraroll';
import type { NativeSyntheticEvent } from 'react-native';
import type { ImageLoadEventData } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Routes } from './Routes';
import { useIsFocused } from '@react-navigation/core';
import { red } from 'react-native-reanimated/src/reanimated2/Colors';

import { faMugSaucer } from '@fortawesome/free-solid-svg-icons/faMugSaucer';

import Draggable from 'react-native-draggable';
import NounsGlasses from '../images/glasses-hip-purple.png';

import { nounGlassesUris, nounHeadUris } from './utils/overlays';

// import supabase from './supabaseClient';
import { decode } from 'base64-arraybuffer';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zxkjwylavdufoezubvlf.supabase.co';
const supabaseKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4a2p3eWxhdmR1Zm9lenVidmxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NTk2MDAwMjMsImV4cCI6MTk3NTE3NjAyM30.UAVMFf6XhGnTCvgDjsTlKqr8q4Ri_UPn0VF0SqfayEU'; //process.env.SUPABASE_KEY

//process.env.REACT_APP_SUPABASE_KEY;
// Create a single supabase client for interacting with your database
const supabase = createClient(supabaseUrl, supabaseKey);

const SLIDER_WIDTH = Dimensions.get('window').width;
const ITEM_WIDTH = Math.round(SLIDER_WIDTH * 0.7) / 2;
const ITEM_HEIGHT = Math.round((ITEM_WIDTH * 3) / 4);

const requestSavePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;

  const permission = PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE;
  if (permission == null) return false;
  let hasPermission = await PermissionsAndroid.check(permission);
  if (!hasPermission) {
    const permissionRequestResult = await PermissionsAndroid.request(permission);
    hasPermission = permissionRequestResult === 'granted';
  }
  return hasPermission;
};

const isVideoOnLoadEvent = (event: OnLoadData | NativeSyntheticEvent<ImageLoadEventData>): event is OnLoadData =>
  'duration' in event && 'naturalSize' in event;

type Props = NativeStackScreenProps<Routes, 'MediaPage'>;
export function MediaPage({ navigation, route }: Props): React.ReactElement {
  const { path, type } = route.params;
  const { height, width } = useWindowDimensions();
  const [hasMediaLoaded, setHasMediaLoaded] = useState(false);
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false);
  const [isShowingCarousel, setIsShowingCarousel] = useState(false);

  const isForeground = useIsForeground();
  const isScreenFocused = useIsFocused();
  const isVideoPaused = !isForeground || !isScreenFocused;
  const [savingState, setSavingState] = useState<'none' | 'saving' | 'saved'>('none');

  useEffect(() => {
    if (isCapturingScreenshot) {
      captureScreen({
        format: 'jpg',
        quality: 0.8,
      }).then(
        async (uri) => {
          RNFS.readFile(uri, 'base64').then(async (res) => {
            
            const filename = path.substr(path.lastIndexOf('/') + 1);
            await uploadImage(filename, res);
            navigation.goBack();
          });
        },
        (error) => console.error('Oops, snapshot failed', error),
      );
    }
  }, [isCapturingScreenshot]);

  /**
   * upload to storage bucket, convert path to blob
   * get file name from path
   *
   * @param path
   */
  const uploadImage = async (filename: string, base64: string) => {
    const imagePath = base64.replace('data:image/jpeg;base64,', '');

    const { data, error } = await supabase.storage.from('image-bucket').upload(filename, decode(imagePath), {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/jpg',
    });

    console.log(data);
    console.log(error);
    console.log();

    return true;
  };

  const onMediaLoad = useCallback((event: OnLoadData | NativeSyntheticEvent<ImageLoadEventData>) => {
    if (isVideoOnLoadEvent(event)) {
      console.log(
        `Video loaded. Size: ${event.naturalSize.width}x${event.naturalSize.height} (${event.naturalSize.orientation}, ${event.duration} seconds)`,
      );
    } else {
      console.log(`Image loaded. Size: ${event.nativeEvent.source.width}x${event.nativeEvent.source.height}`);
    }
  }, []);
  const onMediaLoadEnd = useCallback(() => {
    console.log('media has loaded.');
    setHasMediaLoaded(true);
  }, []);
  const onMediaLoadError = useCallback((error: LoadError) => {
    console.log(`failed to load media: ${JSON.stringify(error)}`);
  }, []);

  const onSavePressed = () => {
    console.log('HERHERHEH');
    setIsShowingCarousel(true);

    // try {
    //   setSavingState('saving');

    //   const hasPermission = await requestSavePermission();
    //   if (!hasPermission) {
    //     Alert.alert('Permission denied!', 'Vision Camera does not have permission to save the media to your camera roll.');
    //     return;
    //   }
    //   await CameraRoll.save(`file://${path}`, {
    //     type: type,
    //   });
    //   setSavingState('saved');
    // } catch (e) {
    //   const message = e instanceof Error ? e.message : JSON.stringify(e);
    //   setSavingState('none');
    //   Alert.alert('Failed to save!', `An unexpected error occured while trying to save your ${type}. ${message}`);
    // }
  };

  const source = useMemo(() => ({ uri: `file://${path}` }), [path]);
  const screenStyle = useMemo(() => ({ opacity: hasMediaLoaded ? 1 : 0 }), [hasMediaLoaded]);

  const [xCoordinateOverlay, setXCoordinateOverlay] = useState(-1);
  const [yCoordinateOverlay, setYCoordinateOverlay] = useState(-height / 2);

  const dragged = (event, gestureState, bounds) => {
    // console.log(event);
    console.log(gestureState);
    // console.log(bounds);
  };

  const onCapture = useCallback((uri) => {
    console.log('do something with ', uri);
  }, []);

  const onSubmitImage = () => {
    setIsCapturingScreenshot(true);
  };

  const [imageOverlays, setImageOverlays] = useState([]);

  const _renderItem = (item) => {
    // console.log('ITEM', item);
    if (item.item === '') {
    }
    const uri = item.item as string;
    return (
      <PressableOpacity
        key={item.index}
        style={styles.itemContainer}
        onPress={() => {
          const newOverlays = imageOverlays;
          newOverlays.push(item.index);
          setImageOverlays(newOverlays);
          setIsShowingCarousel(false);
        }}>
        <Text style={styles.itemLabel}>{''}</Text>
        <Image
          source={item.item}
          resizeMode="contain"
          style={{
            position: 'relative',
            height: 120,
            width: 140,
            // backgroundColor: 'red',
          }}
        />
      </PressableOpacity>
    );
  };

  useEffect(() => {
    console.log('HERE');
    console.log(imageOverlays);
    console.log();
  }, [imageOverlays]);

  const ref = useRef(null);

  console.log(imageOverlays);
  return (
    <ViewShot style={[styles.container, screenStyle]} onCapture={onCapture} captureMode="mount">
      {type === 'photo' && (
        <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" onLoadEnd={onMediaLoadEnd} onLoad={onMediaLoad} />
      )}
      {type === 'video' && (
        <Video
          source={source}
          style={StyleSheet.absoluteFill}
          paused={isVideoPaused}
          resizeMode="cover"
          posterResizeMode="cover"
          allowsExternalPlayback={false}
          automaticallyWaitsToMinimizeStalling={false}
          disableFocus={true}
          repeat={true}
          useTextureView={false}
          controls={false}
          playWhenInactive={true}
          ignoreSilentSwitch="ignore"
          onReadyForDisplay={onMediaLoadEnd}
          onLoad={onMediaLoad}
          onError={onMediaLoadError}
        />
      )}

      {!isCapturingScreenshot && (
        <PressableOpacity style={styles.closeButton} onPress={navigation.goBack}>
          <IonIcon name="close" size={35} color="white" style={styles.icon} />
        </PressableOpacity>
      )}

      {isShowingCarousel ? (
        <Carousel
          ref={ref}
          data={nounGlassesUris}
          containerCustomStyle={styles.carouselContainer}
          renderItem={_renderItem}
          sliderWidth={SLIDER_WIDTH}
          itemWidth={ITEM_WIDTH + 12}
        />
      ) : (
        <>
          {!isCapturingScreenshot && (
            <>
              <Pressable style={styles.saveButton} onPress={onSavePressed} disabled={savingState !== 'none'}>
                {savingState === 'none' && (
                  <IonIcon name="download" size={44} onPress={onSavePressed} color="white" style={{ marginTop: -16 }} />
                )}
                {savingState === 'saved' && <IonIcon name="checkmark" size={35} color="white" style={styles.icon} />}
                {savingState === 'saving' && <ActivityIndicator color="white" />}
              </Pressable>

              <PressableOpacity style={{ position: 'absolute', right: '6.5%', bottom: '4.8%' }} onPress={onSubmitImage}>
                <FontAwesomeIcon icon={faCircleArrowRight} size={48} style={{ color: 'white' }} />
              </PressableOpacity>
            </>
          )}
        </>
      )}

      {imageOverlays.map((value) => {
        console.log('IMAGE OVERLAYS ');
        console.log(img);
        console.log('-----');

        const img = nounGlassesUris[value];
        return (
          <PressableOpacity style={styles.saveButton}>
            <Draggable x={xCoordinateOverlay} y={yCoordinateOverlay} onDragRelease={dragged}>
              <Image source={img} style={styles.overlay} resizeMode="contain" />
            </Draggable>
          </PressableOpacity>
        );
      })}
    </ViewShot>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  closeButton: {
    position: 'absolute',
    top: SAFE_AREA_PADDING.paddingTop,
    left: SAFE_AREA_PADDING.paddingLeft,
    width: 40,
    height: 40,
  },
  saveButton: {
    position: 'absolute',
    bottom: SAFE_AREA_PADDING.paddingBottom,
    left: SAFE_AREA_PADDING.paddingLeft,
    width: 40,
    height: 40,
    zIndex: 100,
  },
  icon: {
    textShadowColor: 'black',
    textShadowOffset: {
      height: 0,
      width: 0,
    },
    textShadowRadius: 8,
  },
  overlay: {
    position: 'absolute',
    width: 200,
    height: 150,
  },
  carouselContainer: {
    position: 'absolute',
    bottom: 30,
  },
  itemContainer: {
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 2,
    borderColor: 'white',
    borderRadius: 14,
  },
  itemLabel: {
    color: 'white',
    fontSize: 24,
  },
});
